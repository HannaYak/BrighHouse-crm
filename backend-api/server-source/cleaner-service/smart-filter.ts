// Описываем интерфейсы на основе нашей схемы БД
interface Cleaner {
  id: number;
  firstName: string;
  lastName: string;
  tags: string[]; // Например: ['только_поддерживающая', 'аллергия_на_кошек']
  incompatibleCleanerIds: number[]; // Массив ID тех, с кем конфликт
}

interface Client {
  id: number;
  name: string;
  blacklistCleanerIds: number[]; // ID забаненных клинеров
  favoriteCleanerIds: number[];  // ID любимчиков
}

interface OrderRequirements {
  serviceType: 'maintenance' | 'general' | 'post_construction'; // Тип уборки
  hasPets: boolean;        // Есть ли дома животные
  assignedCleanerId?: number | null; // Уже выбранный первый клинер (если есть)
}

/**
 * Умный фильтр клинеров — главный защитник расписания от ошибок менеджера
 */
export function filterAvailableCleaners(
  allCleaners: Cleaner[],
  client: Client,
  requirements: OrderRequirements
): Cleaner[] {
  
  return allCleaners.filter(cleaner => {
    
    // 1. Проверка ЧЕРНОГО СПИСКА клиента
    if (client.blacklistCleanerIds.includes(cleaner.id)) {
      return false; // Сразу отсекаем, клиент просил этого человека не присылать
    }

    // 2. Проверка ограничений по ТИПУ УБОРКИ (Теги здоровья/допусков)
    if (
      (requirements.serviceType === 'general' || requirements.serviceType === 'post_construction') &&
      cleaner.tags.includes('только_поддерживающая')
    ) {
      return false; // Клинер не делает генеральные или послестроительные уборки
    }

    // 3. Проверка АЛЛЕРГИИ НА ЖИВОТНЫХ
    if (requirements.hasPets && cleaner.tags.includes('аллергия_на_животных')) {
      return false; // У клиента есть питомцы, а у клинера жесткая аллергия
    }

    // 4. Проверка НЕСОВМЕСТИМОСТИ НАПАРНИКОВ (Конфликты в коллективе)
    if (requirements.assignedCleanerId) {
      // Если у уже назначенного первого клинера текущий кандидат находится в списке несовместимых
      if (cleaner.incompatibleCleanerIds.includes(requirements.assignedCleanerId)) {
        return false; 
      }
      // Обратная проверка: если у текущего кандидата первый клинер записан как несовместимый
      const firstCleaner = allCleaners.find(c => c.id === requirements.assignedCleanerId);
      if (firstCleaner && firstCleaner.incompatibleCleanerIds.includes(cleaner.id)) {
        return false;
      }
    }

    // Если все проверки пройдены — клинер подходит!
    return true;
  });
}
