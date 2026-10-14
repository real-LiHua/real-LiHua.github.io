// Date helpers built on dayjs.

import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

const ZERO_DATE_MS = 0;
const ZERO_DATE = dayjs(ZERO_DATE_MS);

/** Format a date for display. - `full` → `YYYY-MM-DD` - `short` → `YYYY.MM.DD` (default) */
export const formatDate = (
  date: Date | string | undefined,
  format: "full" | "short" = "short",
): string => {
  if (!date) {
    return "";
  }

  const value = dayjs(date);
  if (format === "full") {
    return value.format("YYYY-MM-DD");
  }
  return value.format("YYYY.MM.DD");
};

/** Sort posts by `publishDate`, newest first by default. Missing dates sort last. */
export const sortByDate = <Post extends { publishDate?: Date | string }>(
  items: Post[],
  order: "asc" | "desc" = "desc",
): Post[] => {
  const getDate = (post: Post): dayjs.Dayjs =>
    post.publishDate ? dayjs(post.publishDate) : ZERO_DATE;

  return [...items].toSorted((itemA, itemB) => {
    const dateA = getDate(itemA);
    const dateB = getDate(itemB);
    if (order === "desc") {
      return dateB.diff(dateA);
    }
    return dateA.diff(dateB);
  });
};
