export interface CleanerCheck {
  id: number;
  name: string;
  tags: string[];
  district: string;
}

export interface OrderRequirements {
  hasPets?: boolean;
  isGeneral?: boolean;
  district?: string;
  blacklistedCleanerName?: string;
}

export function filterAvailableCleaners(
  cleaners: CleanerCheck[],
  requirements: OrderRequirements
): { eligible: CleanerCheck[]; rejected: { cleaner: CleanerCheck; reason: string }[] } {
  const eligible: CleanerCheck[] = [];
  const rejected: { cleaner: CleanerCheck; reason: string }[] = [];

  for (const cleaner of cleaners) {
    // 1. Проверка черного списка клиента
    if (requirements.blacklistedCleanerName && cleaner.name.toLowerCase() === requirements.blacklistedCleanerName.toLowerCase()) {
      rejected.push({ cleaner, reason: 'В черном списке клиента' });
      continue;
    }

    // 2. Проверка аллергии на животных
    if (requirements.hasPets && cleaner.tags.some(t => t.includes('аллергия') || t.includes('без_животных'))) {
      rejected.push({ cleaner, reason: 'Аллергия на животных' });
      continue;
    }

    // 3. Проверка сложности (генеральная уборка)
    if (requirements.isGeneral && cleaner.tags.includes('только_поддерживающая')) {
      rejected.push({ cleaner, reason: 'Не выполняет генеральные уборки' });
      continue;
    }

    eligible.push(cleaner);
  }

  return { eligible, rejected };
}
