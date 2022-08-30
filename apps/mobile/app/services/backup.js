/* This file is part of the Notesnook project (https://notesnook.com/)
 *
 * Copyright (C) 2022 Streetwriters (Private) Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Platform } from "react-native";
import FileViewer from "react-native-file-viewer";
import * as ScopedStorage from "react-native-scoped-storage";
import Share from "react-native-share";
import RNFetchBlob from "rn-fetch-blob";
import { presentDialog } from "../components/dialog/functions";
import { db } from "../common/database";
import storage from "../common/database/storage";
import { eCloseProgressDialog } from "../utils/events";
import { sanitizeFilename } from "../utils/sanitizer";
import { sleep } from "../utils/time";
import { eSendEvent, presentSheet, ToastEvent } from "./event-manager";
import SettingsService from "./settings";

const MS_DAY = 86400000;
const MS_WEEK = MS_DAY * 7;
const MONTH = MS_DAY * 30;

async function getDirectoryAndroid() {
  let folder = await ScopedStorage.openDocumentTree(true);
  if (!folder) return null;
  let subfolder;
  if (!folder.name.includes("Notesnook backups")) {
    let folderFiles = await ScopedStorage.listFiles(folder.uri);
    for (let f of folderFiles) {
      if (f.type === "directory" && f.name === "Notesnook backups") {
        console.log("folder already exists. reusing");
        subfolder = f;
      }
    }
    if (!subfolder) {
      subfolder = await ScopedStorage.createDirectory(
        folder.uri,
        "Notesnook backups"
      );
    }
  } else {
    subfolder = folder;
  }
  SettingsService.set({
    backupDirectoryAndroid: subfolder
  });
  return subfolder;
}

async function checkBackupDirExists(reset = false, context = "global") {
  if (Platform.OS === "ios") return true;
  let dir = SettingsService.get().backupDirectoryAndroid;
  if (reset) dir = null;
  if (dir) {
    let allDirs = await ScopedStorage.getPersistedUriPermissions();
    let exists = allDirs.findIndex((d) => {
      return d === dir.uri || dir.uri.includes(d);
    });
    exists = exists !== -1;
    dir = exists ? dir : null;
  }
  if (!dir) {
    // eslint-disable-next-line no-async-promise-executor
    dir = await new Promise(async (resolve) => {
      if (reset) {
        resolve(await getDirectoryAndroid());
        return;
      }
      presentDialog({
        title: "Select backup folder",
        paragraph:
          "Please select a folder where you would like to store backup files.",
        positivePress: async () => {
          resolve(await getDirectoryAndroid());
        },
        onClose: () => {
          resolve(null);
        },
        positiveText: "Select",
        context: context
      });
    });
  }

  return dir;
}

async function presentBackupCompleteSheet(backupFilePath) {
  presentSheet({
    title: "Backup complete",
    icon: "cloud-upload",
    paragraph: `${
      Platform.OS === "android"
        ? "Backup file saved in \"Notesnook backups\" folder on your phone"
        : "Backup file is saved in File Manager/Notesnook folder"
    }. Share your backup to your cloud so you do not lose it.`,
    actionText: "Share backup",
    actionsArray: [
      {
        action: () => {
          if (Platform.OS === "ios") {
            console.log(backupFilePath);
            Share.open({
              url: "file:/" + backupFilePath,
              failOnCancel: false
            }).catch(console.log);
          } else {
            FileViewer.open(backupFilePath, {
              showOpenWithDialog: true,
              showAppsSuggestions: true,
              shareFile: true
            }).catch(console.log);
          }
        },
        actionText: "Share"
      },
      {
        action: async () => {
          eSendEvent(eCloseProgressDialog);
          SettingsService.set({
            showBackupCompleteSheet: false
          });
        },
        actionText: "Never ask again",
        type: "grayBg"
      }
    ]
  });
}

async function updateNextBackupTime() {
  SettingsService.set({
    nextBackupRequestTime: Date.now() + 86400000 * 3,
    lastBackupDate: Date.now()
  });
}

async function run(progress, context) {
  let androidBackupDirectory = await checkBackupDirExists(false, context);
  if (!androidBackupDirectory) return;

  let backup;

  if (progress) {
    presentSheet({
      title: "Backing up your data",
      paragraph:
        "All your backups are stored in 'Phone Storage/Notesnook/backups/' folder",
      progress: true
    });
  }

  try {
    backup = await db.backup.export(
      "mobile",
      SettingsService.get().encryptedBackup
    );
    if (!backup) throw new Error("Backup returned empty.");
  } catch (e) {
    await sleep(300);
    eSendEvent(eCloseProgressDialog);
    ToastEvent.error(e, "Backup failed!");
    return null;
  }

  try {
    let backupName = "notesnook_backup_" + Date.now();
    backupName =
      sanitizeFilename(backupName, { replacement: "_" }) + ".nnbackup";
    let path;
    let backupFilePath;

    if (Platform.OS === "ios") {
      path = await storage.checkAndCreateDir("/backups/");
      await RNFetchBlob.fs.writeFile(path + backupName, backup, "utf8");
      backupFilePath = path + backupName;
    } else {
      backupFilePath = await ScopedStorage.writeFile(
        androidBackupDirectory.uri,
        backup,
        backupName,
        "nnbackup/json",
        "utf8",
        false
      );
    }

    updateNextBackupTime();

    ToastEvent.show({
      heading: "Backup successful",
      message: "Your backup is stored in Notesnook folder on your phone.",
      type: "success",
      context: "global"
    });

    let showBackupCompleteSheet = SettingsService.get().showBackupCompleteSheet;
    console.log(backupFilePath);
    if (context) return backupFilePath;
    await sleep(300);
    if (showBackupCompleteSheet) {
      presentBackupCompleteSheet(backupFilePath);
    } else {
      progress && eSendEvent(eCloseProgressDialog);
    }
    return backupFilePath;
  } catch (e) {
    progress && eSendEvent(eCloseProgressDialog);
    ToastEvent.error(e, "Backup failed!");
    return null;
  }
}

async function getLastBackupDate() {
  return SettingsService.get().lastBackupDate;
}

async function checkBackupRequired(type) {
  if (type === "off" || type === "useroff") return;
  let now = Date.now();
  let lastBackupDate = await getLastBackupDate();
  if (!lastBackupDate || lastBackupDate === "never") {
    return true;
  }
  lastBackupDate = parseInt(lastBackupDate);
  if (type === "daily" && lastBackupDate + MS_DAY < now) {
    console.log("daily backup started");
    return true;
  } else if (type === "weekly" && lastBackupDate + MS_WEEK < now) {
    console.log("weekly backup started");
    return true;
  } else if (type === "monthly" && lastBackupDate + MONTH < now) {
    console.log("monthly backup started");
    return true;
  }
  console.log("no need", lastBackupDate);
  return false;
}

const checkAndRun = async () => {
  let settings = SettingsService.get();
  if (await checkBackupRequired(settings.reminder)) {
    try {
      await run();
    } catch (e) {
      console.log(e);
    }
  }
};

const BackupService = {
  checkBackupRequired,
  run,
  checkAndRun,
  getDirectoryAndroid,
  checkBackupDirExists
};

export default BackupService;
