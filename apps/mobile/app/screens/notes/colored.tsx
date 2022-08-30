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

import { groupArray } from "@notesnook/core/utils/grouping";
import React from "react";
import NotesPage, { PLACEHOLDER_DATA } from ".";
import { db } from "../../common/database";
import Navigation, {
  NavigationProps,
  NotesScreenParams
} from "../../services/navigation";
import { ColorType } from "../../utils/types";
import { getAlias, openEditor, toCamelCase } from "./common";
export const ColoredNotes = ({
  navigation,
  route
}: NavigationProps<"ColoredNotes">) => {
  return (
    <NotesPage
      navigation={navigation}
      route={route}
      get={ColoredNotes.get}
      placeholderData={PLACEHOLDER_DATA}
      onPressFloatingButton={openEditor}
      canGoBack={route.params.canGoBack}
      focusControl={true}
    />
  );
};

ColoredNotes.get = (params: NotesScreenParams, grouped = true) => {
  const notes = db.notes?.colored(params.item.id) || [];
  return grouped
    ? groupArray(notes, db.settings?.getGroupOptions("notes"))
    : notes;
};

ColoredNotes.navigate = (item: ColorType, canGoBack: boolean) => {
  if (!item) return;
  const alias = getAlias({ item: item });
  Navigation.navigate<"ColoredNotes">(
    {
      name: "ColoredNotes",
      alias: toCamelCase(alias as string),
      title: toCamelCase(item.title),
      id: item.id,
      type: "color",
      color: item.title?.toLowerCase()
    },
    {
      item: item,
      canGoBack,
      title: toCamelCase(alias as string)
    }
  );
};
