#!/usr/bin/env python3

import csv
import json
import subprocess
import io
from collections import defaultdict
from pathlib import Path

# Структура основных дебютов для учебной базы
MAIN_OPENINGS = {
    "Sicilian_Defense": {
        "name": "Защита Сицилиана",
        "icon": "♞",
        "elo_range": "1300+",
        "description": "Самый популярный и боевой ответ на 1.e4"
    },
    "French_Defense": {
        "name": "Защита Французов",
        "icon": "♗",
        "elo_range": "1200+",
        "description": "Солидный и стратегический выбор против 1.e4"
    },
    "Caro-Kann_Defense": {
        "name": "Защита Каро-Канн",
        "icon": "♕",
        "elo_range": "1200+",
        "description": "Надёжная защита с контрольем центра"
    },
    "Queens_Gambit_Declined": {
        "name": "Отказанный королевский гамбит",
        "icon": "♘",
        "elo_range": "1400+",
        "description": "Лучший дебют за белых в классических партиях"
    },
    "Italian_Game": {
        "name": "Итальянская партия",
        "icon": "♗",
        "elo_range": "1100+",
        "description": "Классический дебют с естественным развитием"
    },
    "Ruy_Lopez": {
        "name": "Испанская партия",
        "icon": "♕",
        "elo_range": "1300+",
        "description": "Самая популярная и сильная дебютная система"
    },
    "English_Opening": {
        "name": "Английское начало",
        "icon": "☗",
        "elo_range": "1200+",
        "description": "Гибкое начало с контролем центра с фланга"
    },
    "Queens_Pawn_Game": {
        "name": "Ферзевая дебют",
        "icon": "♘",
        "elo_range": "1100+",
        "description": "Прямолинейное начально с 1.d4"
    },
    "Scandinavian_Defense": {
        "name": "Скандинавская защита",
        "icon": "♗",
        "elo_range": "1100+",
        "description": "Активная защита с ранней позиционной игрой"
    },
    "Indian_Defense": {
        "name": "Индийская защита",
        "icon": "☗",
        "elo_range": "1300+",
        "description": "Гибкое управление центром с помощью фланговых фигур"
    }
}

def parse_puzzle_database(csv_path):
    """Парсить lichess_db_puzzle.csv.zst и собрать статистику по OpeningTags"""
    opening_puzzles = defaultdict(list)
    puzzle_count = 0
    
    print(f"📖 Чтение файла {csv_path}...")
    
    # Распаковываем файл через zstd и читаем CSV
    try:
        process = subprocess.Popen(
            ['zstd', '-d', '-c', str(csv_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        reader = csv.DictReader(process.stdout)
        
        for row in reader:
            puzzle_count += 1
            if puzzle_count % 100000 == 0:
                print(f"  ✓ Обработано {puzzle_count:,} пазлов...")
            
            opening_tag = row.get('OpeningTags', '').strip()
            if opening_tag:
                main_opening = opening_tag.split()[0]  # Первая часть
                if main_opening in MAIN_OPENINGS:  # Только нужные дебюты
                    opening_puzzles[main_opening].append({
                        'id': row['PuzzleId'],
                        'fen': row['FEN'],
                        'moves': row['Moves'],
                        'rating': int(row['Rating']),
                        'themes': row['Themes'],
                        'full_tag': opening_tag
                    })
        
        process.wait()
    except Exception as e:
        print(f"❌ Ошибка при чтении файла: {e}")
        return None
    
    return opening_puzzles

def generate_lessons_structure(opening_puzzles):
    """Генерировать JSON структуру уроков"""
    lessons = {
        "version": "1.0",
        "categories": [
            {
                "id": "beginners",
                "name": "Начинающим",
                "icon": "📚",
                "description": "Основные дебютные принципы",
                "subtopics": []
            }
        ]
    }
    
    main_category = lessons["categories"][0]
    
    for opening_id, opening_info in sorted(MAIN_OPENINGS.items()):
        puzzles_count = len(opening_puzzles.get(opening_id, []))
        if puzzles_count == 0:
            continue
            
        subtopic = {
            "id": opening_id.lower(),
            "name": opening_info["name"],
            "opening": opening_id,
            "icon": opening_info["icon"],
            "elo_range": opening_info["elo_range"],
            "description": opening_info["description"],
            "puzzles_count": puzzles_count,
            "lessons": [
                {
                    "id": f"{opening_id.lower()}_basics",
                    "title": f"Основы {opening_info['name']}",
                    "order": 1,
                    "description": f"Изучение основных идей и принципов {opening_info['name']}",
                    "puzzle_themes": ["opening", "middlegame"],
                    "puzzle_limit": 5
                },
                {
                    "id": f"{opening_id.lower()}_traps",
                    "title": f"Ловушки и опасности",
                    "order": 2,
                    "description": "Типичные ошибки и тактические удары",
                    "puzzle_themes": ["crushing", "hangingPiece", "fork"],
                    "puzzle_limit": 3
                },
                {
                    "id": f"{opening_id.lower()}_tactics",
                    "title": f"Тактика в {opening_info['name']}",
                    "order": 3,
                    "description": "Типичные тактические мотивы в этом дебюте",
                    "puzzle_themes": ["pin", "skewer", "verylong"],
                    "puzzle_limit": 5
                }
            ]
        }
        main_category["subtopics"].append(subtopic)
    
    return lessons

def main():
    csv_path = Path("./puzzles/lichess_db_puzzle.csv.zst")
    
    if not csv_path.exists():
        print(f"❌ Файл не найден: {csv_path}")
        return
    
    # Парсим базу пазлов
    opening_puzzles = parse_puzzle_database(csv_path)
    if not opening_puzzles:
        return
    
    print(f"\n✅ Загружено пазлов по дебютам: {sum(len(p) for p in opening_puzzles.values()):,}")
    print(f"📊 Найденных открытий: {len(opening_puzzles)}")
    
    # Генерируем структуру уроков
    lessons = generate_lessons_structure(opening_puzzles)
    
    # Сохраняем JSON
    output_path = Path("./frontend/src/data/lessons.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(lessons, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Сохранено в {output_path}")
    print(f"📚 Создано категорий: {len(lessons['categories'])}")
    print(f"📖 Создано подтем: {sum(len(c['subtopics']) for c in lessons['categories'])}")
    print(f"✏️  Создано уроков: {sum(len(st['lessons']) for c in lessons['categories'] for st in c['subtopics'])}")

if __name__ == "__main__":
    main()
