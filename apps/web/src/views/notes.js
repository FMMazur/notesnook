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

import { useEffect, useState } from "react";
import ListContainer from "../components/list-container";
import { useStore as useNotesStore } from "../stores/note-store";
import NotesPlaceholder from "../components/placeholders/notesplacholder";
import { hashNavigate, navigate } from "../navigation";
import FavoritesPlaceholder from "../components/placeholders/favorites-placeholder";
import { groupArray } from "@notesnook/core/utils/grouping";
import { db } from "../common/db";
import { Flex, Text } from "@streetwriters/rebass";
import { SyncError } from "../components/icons";

function Notes() {
  const [isSynced, setIsSynced] = useState(true);
  const context = useNotesStore((store) => store.context);
  const refreshContext = useNotesStore((store) => store.refreshContext);
  const type = context?.type === "favorite" ? "favorites" : "notes";

  useEffect(() => {
    if (context?.type === "color" && context?.notes?.length <= 0) {
      navigate("/", true);
    }
  }, [context]);

  useEffect(() => {
    if (context?.type === "topic") {
      const { id, topic } = context.value;
      if (!db.notebooks.notebook(id)?.topics.topic(topic)?.synced())
        setIsSynced(false);
    }
  }, [context]);

  if (!context) return null;
  return (
    <ListContainer
      type="notes"
      groupType={type}
      refresh={refreshContext}
      context={{ ...context, notes: undefined }}
      items={groupArray(context.notes, db.settings.getGroupOptions(type))}
      header={
        isSynced ? null : (
          <Flex bg="errorBg" p={2} py={1} alignItems="center">
            <SyncError color="error" size={16} />
            <Text variant={"body"} color="error" ml={1}>
              Some notes of this topic are not synced.
            </Text>
          </Flex>
        )
      }
      placeholder={
        context.type === "favorite" ? FavoritesPlaceholder : NotesPlaceholder
      }
      button={{
        content: "Make a new note",
        onClick: () =>
          hashNavigate("/notes/create", { addNonce: true, replace: true })
      }}
    />
  );
}
export default Notes;
