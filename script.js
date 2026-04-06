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
const rootStyles = getComputedStyle(document.documentElement);

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

function themeColor(name, fallback) {
  const value = rootStyles.getPropertyValue(name).trim();
  return value || fallback;
}

function drawOtter(cellSize) {
  const centerX = state.player.x * cellSize + cellSize / 2;
  const centerY = state.player.y * cellSize + cellSize / 2;
  const furDark = "#8b5636";
  const furMid = "#b9774e";
  const furLight = "#f3dfc1";
  const noseColor = "#352017";
  const whiskerColor = "#fff6eb";
  const pawColor = "#70442b";
  const mapColor = "#d8bb82";
  const mapLine = "#8f6a35";
  const leafColor = "#4d8b4f";

  ctx.save();
  ctx.translate(centerX, centerY);

  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.ellipse(0, cellSize * 0.03, cellSize * 0.18, cellSize * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cellSize * 0.22, cellSize * 0.15, cellSize * 0.07, cellSize * 0.18, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = furMid;
  ctx.beginPath();
  ctx.arc(0, -cellSize * 0.13, cellSize * 0.17, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-cellSize * 0.11, -cellSize * 0.23, cellSize * 0.055, 0, Math.PI * 2);
  ctx.arc(cellSize * 0.11, -cellSize * 0.23, cellSize * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = furLight;
  ctx.beginPath();
  ctx.ellipse(0, cellSize * 0.09, cellSize * 0.1, cellSize * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -cellSize * 0.09, cellSize * 0.12, cellSize * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#121212";
  ctx.beginPath();
  ctx.arc(-cellSize * 0.055, -cellSize * 0.15, cellSize * 0.02, 0, Math.PI * 2);
  ctx.arc(cellSize * 0.055, -cellSize * 0.15, cellSize * 0.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = noseColor;
  ctx.beginPath();
  ctx.ellipse(0, -cellSize * 0.09, cellSize * 0.03, cellSize * 0.022, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = whiskerColor;
  ctx.lineWidth = Math.max(1, cellSize * 0.012);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-cellSize * 0.03, -cellSize * 0.085);
  ctx.lineTo(-cellSize * 0.13, -cellSize * 0.11);
  ctx.moveTo(-cellSize * 0.03, -cellSize * 0.065);
  ctx.lineTo(-cellSize * 0.13, -cellSize * 0.05);
  ctx.moveTo(cellSize * 0.03, -cellSize * 0.085);
  ctx.lineTo(cellSize * 0.13, -cellSize * 0.11);
  ctx.moveTo(cellSize * 0.03, -cellSize * 0.065);
  ctx.lineTo(cellSize * 0.13, -cellSize * 0.05);
  ctx.stroke();

  ctx.strokeStyle = noseColor;
  ctx.lineWidth = Math.max(1.2, cellSize * 0.012);
  ctx.beginPath();
  ctx.moveTo(-cellSize * 0.035, -cellSize * 0.045);
  ctx.quadraticCurveTo(0, -cellSize * 0.02, cellSize * 0.035, -cellSize * 0.045);
  ctx.stroke();

  ctx.fillStyle = leafColor;
  ctx.beginPath();
  ctx.ellipse(-cellSize * 0.16, -cellSize * 0.06, cellSize * 0.05, cellSize * 0.025, -0.7, 0, Math.PI * 2);
  ctx.ellipse(-cellSize * 0.11, -cellSize * 0.015, cellSize * 0.045, cellSize * 0.022, 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = mapColor;
  ctx.fillRect(-cellSize * 0.09, -cellSize * 0.005, cellSize * 0.18, cellSize * 0.16);
  ctx.strokeStyle = mapLine;
  ctx.lineWidth = Math.max(1, cellSize * 0.01);
  ctx.strokeRect(-cellSize * 0.09, -cellSize * 0.005, cellSize * 0.18, cellSize * 0.16);
  ctx.beginPath();
  ctx.moveTo(-cellSize * 0.06, cellSize * 0.03);
  ctx.lineTo(-cellSize * 0.02, cellSize * 0.03);
  ctx.lineTo(-cellSize * 0.02, cellSize * 0.065);
  ctx.lineTo(cellSize * 0.025, cellSize * 0.065);
  ctx.lineTo(cellSize * 0.025, cellSize * 0.02);
  ctx.lineTo(cellSize * 0.06, cellSize * 0.02);
  ctx.moveTo(-cellSize * 0.055, cellSize * 0.085);
  ctx.lineTo(-cellSize * 0.015, cellSize * 0.085);
  ctx.lineTo(-cellSize * 0.015, cellSize * 0.12);
  ctx.lineTo(cellSize * 0.03, cellSize * 0.12);
  ctx.lineTo(cellSize * 0.03, cellSize * 0.085);
  ctx.lineTo(cellSize * 0.06, cellSize * 0.085);
  ctx.stroke();

  ctx.fillStyle = pawColor;
  ctx.beginPath();
  ctx.ellipse(-cellSize * 0.115, cellSize * 0.05, cellSize * 0.04, cellSize * 0.06, 0.25, 0, Math.PI * 2);
  ctx.ellipse(cellSize * 0.115, cellSize * 0.05, cellSize * 0.04, cellSize * 0.06, -0.25, 0, Math.PI * 2);
  ctx.ellipse(-cellSize * 0.06, cellSize * 0.275, cellSize * 0.045, cellSize * 0.028, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cellSize * 0.06, cellSize * 0.275, cellSize * 0.045, cellSize * 0.028, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMaze() {
  const size = state.maze.length;
  const cellSize = canvas.width / size;
  const wallColor = themeColor("--wall", "#040404");
  const pathColor = themeColor("--path", "#0f0f10");
  const goalColor = themeColor("--goal", "#ffffff");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      ctx.fillStyle = state.maze[y][x] === 1 ? wallColor : pathColor;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  ctx.fillStyle = goalColor;
  ctx.fillRect(
    state.goal.x * cellSize + cellSize * 0.2,
    state.goal.y * cellSize + cellSize * 0.2,
    cellSize * 0.6,
    cellSize * 0.6
  );

  drawOtter(cellSize);
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
