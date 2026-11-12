interface SeriesMetadata {
  id: string;
  title: string;
  order: number;
}

interface SeriesEntry {
  id: string;
  data: {
    series?: SeriesMetadata;
  };
}

export function assertUniqueSeriesPositions(entries: SeriesEntry[]): void {
  const positions = new Map<string, string>();

  for (const entry of entries) {
    const { series } = entry.data;
    if (!series) {
      continue;
    }

    const key = `${series.id}:${series.order}`;
    const previousId = positions.get(key);
    if (previousId) {
      throw new Error(
        `Series "${series.id}" has duplicate order ${series.order} in entries "${previousId}" and "${entry.id}".`,
      );
    }

    positions.set(key, entry.id);
  }
}
