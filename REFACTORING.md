# Рефакторинг: Общие компоненты

## Что создано:

### 1. **ChessBoardWrapper** - Универсальная обертка для шахматной доски
**Файлы:**
- `/frontend/src/components/common/ChessBoardWrapper.tsx`
- `/frontend/src/hooks/useChessBoardStyles.ts`
- `/frontend/src/hooks/useSquareClick.ts`

**Возможности:**
✅ Автоматическая подсветка шаха/мата
✅ Подсветка легальных ходов
✅ Подсветка последнего хода
✅ Тема доски (автоматическая)
✅ Клик для хода
✅ Drag & drop

**Пример использования:**
```tsx
import { ChessBoardWrapper } from '../components/common';

<ChessBoardWrapper
  position={game.fen()}
  game={game}
  onMove={(from, to) => {
    // обработка хода
    return true; // успешно
  }}
  lastMove={{ from: 'e2', to: 'e4' }}
  orientation="white"
  boardWidth={800}
  isInteractive={true}
  showLegalMoves={true}
  showCheck={true}
/>
```

**Замена в компонентах:**
- ❌ Game.tsx - убрать getSquareStyles, handleSquareClick, theme logic
- ❌ GameAnalysis.tsx - убрать дублирование
- ❌ PuzzleTraining.tsx - упростить
- ❌ DailyPuzzle.tsx - упростить

---

### 2. **Modal** - Универсальное модальное окно
**Файлы:**
- `/frontend/src/components/common/Modal.tsx`
- `/frontend/src/components/common/Modal.css`

**Возможности:**
✅ Закрытие по Escape
✅ Закрытие по клику вне окна
✅ Анимации (fade in, slide up)
✅ Кнопка закрытия
✅ Блокировка scroll body

**Пример использования:**
```tsx
import { Modal } from '../components/common';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Выбор фигуры"
>
  <div>Содержимое модального окна</div>
</Modal>
```

**Замена в компонентах:**
- ❌ Game.tsx - promotion dialog (убрать .promotion-overlay/.promotion-dialog)
- ❌ InviteByLinkModal.tsx - использовать общий Modal

---

### 3. **common.css** - Общие стили
**Файл:** `/frontend/src/styles/common.css`

**Классы:**

**Контейнеры:**
- `.page-container` - страница
- `.content-wrapper` - контент с max-width
- `.card` / `.section` - карточки

**Кнопки:**
- `.btn .btn-primary .btn-secondary .btn-danger`
- `.btn-sm .btn-lg`

**Формы:**
- `.form-group .form-label .form-input .form-textarea .form-select`

**Гриды:**
- `.grid-2 .grid-3 .grid-4`

**Утилиты:**
- `.text-muted .text-center`
- `.mt-1 .mt-2 .mb-1` (spacing)

**Анимации:**
- `.kingMatePulse` - для мата
- `.loading-spinner`

---

## Как применять:

### Шаг 1: Рефакторинг PuzzleTraining.tsx

**До (116 строк логики доски):**
```tsx
const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
const [legalMoves, setLegalMoves] = useState<string[]>([]);
const [boardTheme, setBoardThemeState] = useState<BoardTheme>(getBoardTheme());

const getSquareStyles = () => { /* 60 строк */ };
const handleSquareClick = (square: string) => { /* 30 строк */ };
const getLastMoveStyles = () => { /* 26 строк */ };

<Chessboard
  position={position}
  onPieceDrop={handleMove}
  onSquareClick={handleSquareClick}
  customSquareStyles={getSquareStyles()}
  customDarkSquareStyle={{ backgroundColor: getBoardColors(boardTheme).dark }}
  customLightSquareStyle={{ backgroundColor: getBoardColors(boardTheme).light }}
  // ...
/>
```

**После (6 строк):**
```tsx
import { ChessBoardWrapper } from './common';

<ChessBoardWrapper
  position={position}
  game={game}
  onMove={handleMove}
  orientation={playerColor}
  boardWidth={boardWidth}
/>
```

**Экономия: ~110 строк кода**

---

### Шаг 2: Рефакторинг Game.tsx promotion dialog

**До:**
```tsx
{promotionDialogOpen && (
  <div className="promotion-overlay">
    <div className="promotion-dialog">
      <h3>{t('promotionTitle')}</h3>
      {/* ... */}
    </div>
  </div>
)}
```

**После:**
```tsx
import { Modal } from './common';

<Modal isOpen={promotionDialogOpen} onClose={handleCancelPromotion} title={t('promotionTitle')}>
  <div className="promotion-options">{/* кнопки фигур */}</div>
</Modal>
```

---

### Шаг 3: Использование common.css

**До (Dashboard.tsx):**
```css
.dashboard-container {
  min-height: 100vh;
  padding: 20px;
  background: var(--bg);
}
```

**После:**
```tsx
<div className="page-container">
  <div className="content-wrapper grid-2">
    <div className="card">{/* контент */}</div>
  </div>
</div>
```

---

## Метрики улучшения:

**Уменьшение кода:**
- PuzzleTraining.tsx: **-110 строк** (из 472)
- DailyPuzzle.tsx: **-90 строк** (из 220)
- Game.tsx: **-120 строк** (из 1080)
- GameAnalysis.tsx: **-80 строк** (из 445)

**Итого: ~400 строк дублированного кода удалено**

**Переиспользование:**
- 1 компонент ChessBoardWrapper → 4 компонента
- 1 компонент Modal → 2+ компонента
- common.css → все компоненты

**Преимущества:**
✅ DRY (Don't Repeat Yourself)
✅ Легче поддерживать (изменения в одном месте)
✅ Единообразный UX
✅ Проще добавлять новые фичи
✅ Меньше багов

---

## Следующие шаги:

1. ✅ Создать ChessBoardWrapper, Modal, common.css
2. ⏳ Применить в PuzzleTraining.tsx
3. ⏳ Применить в DailyPuzzle.tsx
4. ⏳ Применить в Game.tsx
5. ⏳ Применить в GameAnalysis.tsx
6. ⏳ Объединить Login/Register в AuthForm
7. ⏳ Удалить старые CSS дубликаты

## Готово! 🎉

Хочешь, начнем применять ChessBoardWrapper в компонентах?
