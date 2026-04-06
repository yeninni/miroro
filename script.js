const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");
const moveCountElement = document.getElementById("moveCount");
const timerElement = document.getElementById("timer");
const stageLabel = document.getElementById("stageLabel");
const messageElement = document.getElementById("message");
const newMazeButton = document.getElementById("newMazeButton");
const mazeSizeInput = document.getElementById("mazeSize");
const stageList = document.getElementById("stageList");
const nextStageButton = document.getElementById("nextStageButton");

const stages = [
  { size: 9, seed: 101 },
  { size: 11, seed: 212 },
  { size: 11, seed: 323 },
  { size: 13, seed: 434 },
  { size: 13, seed: 545 },
  { size: 15, seed: 656 },
  { size: 15, seed: 767 },
  { size: 17, seed: 878 },
  { size: 19, seed: 989 },
  { size: 21, seed: 1101 },
];

const state = {
  maze: [],
  player: { x: 1, y: 1 },
  goal: { x: 1, y: 1 },
  moveCount: 0,
  startTime: 0,
  timerId: null,
  finished: false,
  stageIndex: 0,
  cleared: new Set(),
};

function createGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(1));
}

function mulberry32(seed) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function buildMaze(size, rng) {
  const maze = createGrid(size);
  const stack = [{ x: 1, y: 1 }];
  maze[1][1] = 0;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const directions = shuffle([
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ], rng);

    let carved = false;

    for (const direction of directions) {
      const nextX = current.x + direction.dx;
      const nextY = current.y + direction.dy;

      if (nextX <= 0 || nextY <= 0 || nextX >= size - 1 || nextY >= size - 1) {
        continue;
      }

      if (maze[nextY][nextX] === 0) {
        continue;
      }

      maze[current.y + direction.dy / 2][current.x + direction.dx / 2] = 0;
      maze[nextY][nextX] = 0;
      stack.push({ x: nextX, y: nextY });
      carved = true;
      break;
    }

    if (!carved) {
      stack.pop();
    }
  }

  maze[1][1] = 0;
  maze[size - 2][size - 2] = 0;

  return maze;
}

function startTimer() {
  clearInterval(state.timerId);
  state.startTime = Date.now();
  timerElement.textContent = "00:00";
  state.timerId = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    timerElement.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function setMessage(text) {
  messageElement.textContent = text;
}

function drawMaze() {
  const size = state.maze.length;
  const cellSize = canvas.width / size;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      ctx.fillStyle = state.maze[y][x] === 1 ? "#324128" : "#f6f0df";
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  ctx.fillStyle = "#f0a202";
  ctx.fillRect(
    state.goal.x * cellSize + cellSize * 0.2,
    state.goal.y * cellSize + cellSize * 0.2,
    cellSize * 0.6,
    cellSize * 0.6
  );

  ctx.fillStyle = "#2f7f72";
  ctx.beginPath();
  ctx.arc(
    state.player.x * cellSize + cellSize / 2,
    state.player.y * cellSize + cellSize / 2,
    cellSize * 0.3,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function setStage(index) {
  state.stageIndex = Math.max(0, Math.min(stages.length - 1, index));
  const stage = stages[state.stageIndex];
  mazeSizeInput.value = String(stage.size);
  stageLabel.textContent = `${state.stageIndex + 1} / ${stages.length}`;
  stageList.querySelectorAll("button").forEach((button) => {
    const buttonIndex = Number(button.dataset.stage);
    button.classList.toggle("active", buttonIndex === state.stageIndex);
    button.classList.toggle("cleared", state.cleared.has(buttonIndex));
  });
}

function resetGame() {
  const stage = stages[state.stageIndex];
  const rng = mulberry32(stage.seed);
  state.maze = buildMaze(stage.size, rng);
  state.player = { x: 1, y: 1 };
  state.goal = { x: stage.size - 2, y: stage.size - 2 };
  state.moveCount = 0;
  state.finished = false;

  moveCountElement.textContent = "0";
  setMessage("출발 지점은 왼쪽 위, 출구는 오른쪽 아래예요.");
  nextStageButton.hidden = true;
  startTimer();
  drawMaze();
}

function tryMove(dx, dy) {
  if (state.finished) {
    return;
  }

  const nextX = state.player.x + dx;
  const nextY = state.player.y + dy;

  if (state.maze[nextY]?.[nextX] !== 0) {
    return;
  }

  state.player = { x: nextX, y: nextY };
  state.moveCount += 1;
  moveCountElement.textContent = String(state.moveCount);
  drawMaze();

  if (nextX === state.goal.x && nextY === state.goal.y) {
    state.finished = true;
    clearInterval(state.timerId);
    state.cleared.add(state.stageIndex);
    setStage(state.stageIndex);
    setMessage(`클리어! ${state.moveCount}번 움직여서 도착했어요.`);
    if (state.stageIndex < stages.length - 1) {
      nextStageButton.hidden = false;
    }
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const moves = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowright: [1, 0],
    d: [1, 0],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
  };

  const nextMove = moves[key];
  if (!nextMove) {
    return;
  }

  event.preventDefault();
  tryMove(nextMove[0], nextMove[1]);
});

mazeSizeInput.addEventListener("input", () => {
  mazeSizeInput.value = String(stages[state.stageIndex].size);
});

newMazeButton.addEventListener("click", resetGame);

nextStageButton.addEventListener("click", () => {
  if (state.stageIndex < stages.length - 1) {
    setStage(state.stageIndex + 1);
    resetGame();
  }
});

stages.forEach((stage, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stage-button";
  button.dataset.stage = String(index);
  button.textContent = `${index + 1}`;
  button.addEventListener("click", () => {
    setStage(index);
    resetGame();
  });
  stageList.appendChild(button);
});

setStage(0);
resetGame();
