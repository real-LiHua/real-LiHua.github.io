import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

const ZERO_DATE_MS = 0;
const ZERO_DATE = dayjs(ZERO_DATE_MS);

export const formatDate = (
  date: Date | string | undefined,
  format: "full" | "short" = "short",
): string => {
  if (!date) {
    return "";
  }
  const dayjsDate = dayjs(date);
  if (format === "full") {
    return dayjsDate.format("YYYY-MM-DD");
  }
  return dayjsDate.format("YYYY.MM.DD");
};

export const sortByDate = <Post extends { publishDate?: Date | string }>(
  items: Post[],
  order: "asc" | "desc" = "desc",
): Post[] => {
  const getDate = (post: Post): dayjs.Dayjs =>
    post.publishDate ? dayjs(post.publishDate) : ZERO_DATE;
  const sorted = [...items].toSorted((itemA, itemB) => {
    const dateA = getDate(itemA);
    const dateB = getDate(itemB);
    if (order === "desc") {
      return dateB.diff(dateA);
    }
    return dateA.diff(dateB);
  });
  return sorted;
};
