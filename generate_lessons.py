#!/usr/bin/env python3

import csv
import json
import subprocess
from collections import defaultdict
from pathlib import Path

# Классификация дебютов по типам
OPENING_CATEGORIES = {
    "Открытые дебюты (1.e4 e5)": {
        "emoji": "🎯",
        "description": "Классические боевые дебюты с открытым центром",
        "openings": [
            "Italian_Game",
            "Spanish_Opening", 
            "Ruy_Lopez",
            "Scotch_Game",
            "Four_Knights_Game",
            "Russian_Game",
            "Vienna_Game",
            "Kings_Gambit_Accepted",
            "Kings_Gambit_Declined",
            "Bishops_Opening",
        ]
    },
    "Полуоткрытые дебюты (1.e4 на д6/с5)": {
        "emoji": "⚔️",
        "description": "Защиты чёрных против 1.e4",
        "openings": [
            "Sicilian_Defense",
            "French_Defense",
            "Caro-Kann_Defense",
            "Scandinavian_Defense",
            "Pirc_Defense",
            "Modern_Defense",
            "Alekhine_Defense",
            "Philidor_Defense",
            "Horwitz_Defense",
            "Owen_Defense",
        ]
    },
    "Закрытые дебюты (1.d4)": {
        "emoji": "🏰",
        "description": "Стратегические дебюты с закрытым центром",
        "openings": [
            "Queens_Gambit_Declined",
            "Queens_Gambit_Accepted",
            "Indian_Defense",
            "Queens_Indian_Defense",
            "Kings_Indian_Defense",
            "Nimzo-Indian_Defense",
            "Grunfeld_Defense",
            "Slav_Defense",
            "Semi-Slav_Defense",
            "Benoni_Defense",
        ]
    },
    "Гамбиты (пожертвование материала)": {
        "emoji": "🎲",
        "description": "Дебюты с ранним пожертвованием пешки или фигуры",
        "openings": [
            "Kings_Gambit_Accepted",
            "Kings_Gambit_Declined",
            "Danish_Gambit_Accepted",
            "Danish_Gambit",
            "Englund_Gambit",
            "Englund_Gambit_Declined",
            "Benko_Gambit",
            "Benko_Gambit_Accepted",
            "Elephant_Gambit",
            "Blackmar-Diemer_Gambit",
        ]
    },
    "Нестандартные начала": {
        "emoji": "✨",
        "description": "Редкие и необычные дебютные системы",
        "openings": [
            "Zukertort_Opening",
            "English_Opening",
            "Trompowsky_Attack",
            "Bird_Opening",
            "Reti_Opening",
            "Catalan_Opening",
            "Nimzo-Larsen_Attack",
            "Polish_Opening",
            "Grob_Opening",
            "Van_Geet_Opening",
        ]
    }
}

def parse_puzzle_database(csv_path, target_openings):
    """Парсить базу пазлов и собрать статистику по выбранным дебютам"""
    opening_puzzles = defaultdict(list)
    puzzle_count = 0
    
    print(f"📖 Чтение файла {csv_path}...")
    
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
            if puzzle_count % 500000 == 0:
                print(f"  ✓ Обработано {puzzle_count:,} пазлов...")
            
            opening_tag = row.get('OpeningTags', '').strip()
            if opening_tag:
                main_opening = opening_tag.split()[0]
                if main_opening in target_openings:
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

def generate_lessons_structure(opening_puzzles, opening_categories):
    """Генерировать JSON структуру уроков с категориями"""
    lessons = {
        "version": "1.0",
        "categories": []
    }
    
    # Маппинг дебютов на названия для отображения
    opening_names = {
        "Sicilian_Defense": ("Защита Сицилиана", "♞"),
        "French_Defense": ("Защита Французов", "♗"),
        "Caro-Kann_Defense": ("Защита Каро-Канн", "♕"),
        "Queens_Gambit_Declined": ("Отказанный королевский гамбит", "♘"),
        "Italian_Game": ("Итальянская партия", "♗"),
        "Ruy_Lopez": ("Испанская партия", "♕"),
        "English_Opening": ("Английское начало", "☗"),
        "Queens_Pawn_Game": ("Ферзевая дебют", "♘"),
        "Scandinavian_Defense": ("Скандинавская защита", "♗"),
        "Indian_Defense": ("Индийская защита", "☗"),
        "Spanish_Opening": ("Испанское начало", "♕"),
        "Scotch_Game": ("Шотландская партия", "♘"),
        "Four_Knights_Game": ("Партия четырёх коней", "♘"),
        "Russian_Game": ("Русская партия", "♗"),
        "Vienna_Game": ("Венская партия", "♗"),
        "Kings_Gambit_Accepted": ("Королевский гамбит принят", "🎲"),
        "Kings_Gambit_Declined": ("Королевский гамбит отклонен", "🎲"),
        "Bishops_Opening": ("Партия слонов", "♗"),
        "Pirc_Defense": ("Защита Пирца", "♗"),
        "Modern_Defense": ("Современная защита", "☗"),
        "Alekhine_Defense": ("Защита Алехина", "♞"),
        "Philidor_Defense": ("Защита Филидора", "♞"),
        "Horwitz_Defense": ("Защита Горвица", "♞"),
        "Owen_Defense": ("Защита Оуэна", "♞"),
        "Queens_Gambit_Accepted": ("Принятый королевский гамбит", "♘"),
        "Queens_Indian_Defense": ("Королевская индийская защита", "♗"),
        "Kings_Indian_Defense": ("Королевская индийская защита (королевская)", "☗"),
        "Nimzo-Indian_Defense": ("Защита Нимцовича-Индийская", "♗"),
        "Grunfeld_Defense": ("Защита Грюнфельда", "☗"),
        "Slav_Defense": ("Защита славян", "♘"),
        "Semi-Slav_Defense": ("Полусла́вская защита", "♘"),
        "Benoni_Defense": ("Защита Бенони", "♘"),
        "Zukertort_Opening": ("Начало Цукерторта", "♞"),
        "Trompowsky_Attack": ("Атака Тромповского", "♗"),
        "Bird_Opening": ("Начало Берда", "♗"),
        "Reti_Opening": ("Начало Рети", "♞"),
        "Catalan_Opening": ("Каталанское начало", "♘"),
        "Nimzo-Larsen_Attack": ("Атака Нимцовича-Ларсена", "♗"),
        "Polish_Opening": ("Польское начало", "♞"),
        "Grob_Opening": ("Начало Гроба", "♞"),
        "Van_Geet_Opening": ("Начало Ван Гита", "♞"),
        "Danish_Gambit_Accepted": ("Датский гамбит принят", "🎲"),
        "Danish_Gambit": ("Датский гамбит", "🎲"),
        "Englund_Gambit": ("Гамбит Энглунда", "🎲"),
        "Englund_Gambit_Declined": ("Гамбит Энглунда отклонен", "🎲"),
        "Benko_Gambit": ("Гамбит Бенко", "🎲"),
        "Benko_Gambit_Accepted": ("Гамбит Бенко принят", "🎲"),
        "Elephant_Gambit": ("Гамбит слона", "🎲"),
        "Blackmar-Diemer_Gambit": ("Гамбит Блекмара-Димера", "🎲"),
    }
    
    for category_name, category_info in opening_categories.items():
        category = {
            "id": category_name.lower().replace(" ", "-").replace("(", "").replace(")", ""),
            "name": category_name,
            "icon": category_info["emoji"],
            "description": category_info["description"],
            "subtopics": []
        }
        
        for opening_id in category_info["openings"]:
            puzzles = opening_puzzles.get(opening_id, [])
            if not puzzles:
                continue
            
            name, icon = opening_names.get(opening_id, (opening_id.replace("_", " "), "♘"))
            
            subtopic = {
                "id": opening_id.lower(),
                "name": name,
                "opening": opening_id,
                "icon": icon,
                "elo_range": "1100+",
                "description": f"Изучение основных идей и принципов {name}",
                "puzzles_count": len(puzzles),
                "lessons": [
                    {
                        "id": f"{opening_id.lower()}_basics",
                        "title": f"Основы {name}",
                        "order": 1,
                        "description": "Изучение начальных принципов и ключевых идей",
                        "puzzle_themes": ["opening", "middlegame"],
                        "puzzle_limit": 5
                    },
                    {
                        "id": f"{opening_id.lower()}_traps",
                        "title": "Ловушки и опасности",
                        "order": 2,
                        "description": "Типичные ошибки и тактические удары",
                        "puzzle_themes": ["crushing", "hangingPiece", "fork"],
                        "puzzle_limit": 3
                    },
                    {
                        "id": f"{opening_id.lower()}_tactics",
                        "title": "Тактика в этом дебюте",
                        "order": 3,
                        "description": "Типичные тактические мотивы",
                        "puzzle_themes": ["pin", "skewer", "verylong"],
                        "puzzle_limit": 5
                    }
                ]
            }
            category["subtopics"].append(subtopic)
        
        if category["subtopics"]:
            lessons["categories"].append(category)
    
    return lessons

def main():
    csv_path = Path("./puzzles/lichess_db_puzzle.csv.zst")
    
    if not csv_path.exists():
        print(f"❌ Файл не найден: {csv_path}")
        return
    
    # Собираем все дебюты для парсинга
    all_openings = set()
    for category in OPENING_CATEGORIES.values():
        all_openings.update(category["openings"])
    
    print(f"📊 Будет загружено дебютов: {len(all_openings)}")
    
    # Парсим базу пазлов
    opening_puzzles = parse_puzzle_database(csv_path, all_openings)
    if not opening_puzzles:
        return
    
    total_puzzles = sum(len(p) for p in opening_puzzles.values())
    print(f"\n✅ Загружено пазлов: {total_puzzles:,}")
    print(f"📊 Найденных дебютов: {len(opening_puzzles)}")
    
    # Генерируем структуру уроков
    lessons = generate_lessons_structure(opening_puzzles, OPENING_CATEGORIES)
    
    # Сохраняем JSON
    output_path = Path("./frontend/src/data/lessons.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(lessons, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Сохранено в {output_path}")
    total_categories = len(lessons['categories'])
    total_subtopics = sum(len(c['subtopics']) for c in lessons['categories'])
    total_lessons = sum(len(st['lessons']) for c in lessons['categories'] for st in c['subtopics'])
    
    print(f"📚 Категорий: {total_categories}")
    print(f"📖 Подтем (дебютов): {total_subtopics}")
    print(f"✏️  Уроков: {total_lessons}")
    
    # Печать статистики по категориям
    print("\n📊 Статистика по категориям:")
    for category in lessons['categories']:
        count = len(category['subtopics'])
        puzzles = sum(st['puzzles_count'] for st in category['subtopics'])
        print(f"  {category['icon']} {category['name']}: {count} дебютов, {puzzles:,} пазлов")

if __name__ == "__main__":
    main()
