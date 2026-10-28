import { Types } from "mongoose";
import { findUsersByIds } from "../repository/user.repository.js";
import { buildNameMap, type NameMap } from "../utils/clinical-mappers.js";

/** Resolves user ids to display names in one query. */
export const loadNames = async (
  ids: (Types.ObjectId | string | undefined)[],
): Promise<NameMap> => {
  const unique = [...new Set(ids.filter((id): id is Types.ObjectId | string => Boolean(id)).map(String))]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  return buildNameMap(unique.length > 0 ? await findUsersByIds(unique) : []);
};
