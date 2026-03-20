export const sanitizeSearchText = (input: string): string => {
  let text = input;

  text = text.replace(
    /\b(from|until)\s*:?\s*(\d{4}-\d{2}-\d{2})\d*/gi,
    (_m, key, date) => `${key}:${date}`,
  );

  return text;
};

export const parseSearchQuery = (query: string) => {
  const datePattern = /(\d{4}-\d{2}-\d{2})/;

  const sincePart = query.match(/since:[^\s]*/)?.[0] || "";
  const untilPart = query.match(/until:[^\s]*/)?.[0] || "";

  const sinceMatch = datePattern.exec(sincePart);
  const untilMatch = datePattern.exec(untilPart);

  const keywords = query
    .replace(/since:[^\s]*/g, "")
    .replace(/until:[^\s]*/g, "")
    .trim();

  return {
    keywords,
    sinceDate: sinceMatch ? sinceMatch[1]! : null,
    untilDate: untilMatch ? untilMatch[1]! : null,
  };
};

export const isValidDate = (dateStr: string): boolean => {
  if (!/^\d+-\d+-\d+$/.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime());
};
