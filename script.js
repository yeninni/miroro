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
  { size: 19, seed: 101, loopChance: 0.04 },
  { size: 21, seed: 212, loopChance: 0.05 },
  { size: 23, seed: 323, loopChance: 0.06 },
  { size: 25, seed: 434, loopChance: 0.07 },
  { size: 27, seed: 545, loopChance: 0.08 },
  { size: 29, seed: 656, loopChance: 0.09 },
  { size: 31, seed: 767, loopChance: 0.1 },
  { size: 33, seed: 878, loopChance: 0.11 },
  { size: 37, seed: 989, loopChance: 0.12 },
  { size: 41, seed: 1101, loopChance: 0.13 },
  ...Array.from({ length: 30 }, (_, index) => ({
    size: 43 + index * 2,
    seed: 1212 + index * 111,
    loopChance: Number(Math.min(0.28, 0.14 + index * 0.005).toFixed(3)),
  })),
];

const stageThemes = [
  {
    name: "Sunset Ruins",
    accent: "#ff7a59",
    accentStrong: "#ff4d2d",
    player: "#ffd166",
    goal: "#fff1b8",
    path: "#40212b",
    wall: "#12070d",
    bgTop: "#35131d",
    bgBottom: "#12060b",
    panel: "rgba(32, 10, 16, 0.86)",
    panelBorder: "rgba(255, 146, 122, 0.18)",
    pattern: "embers",
  },
  {
    name: "Neon Circuit",
    accent: "#5ce1e6",
    accentStrong: "#00bcd4",
    player: "#a7ff83",
    goal: "#d8fff5",
    path: "#112636",
    wall: "#061019",
    bgTop: "#0d2233",
    bgBottom: "#030912",
    panel: "rgba(6, 21, 31, 0.86)",
    panelBorder: "rgba(92, 225, 230, 0.18)",
    pattern: "circuit",
  },
  {
    name: "Moss Temple",
    accent: "#9ad04b",
    accentStrong: "#6caf2f",
    player: "#ffe28a",
    goal: "#f4ffd4",
    path: "#25351e",
    wall: "#0d150a",
    bgTop: "#1f3118",
    bgBottom: "#091007",
    panel: "rgba(17, 27, 12, 0.86)",
    panelBorder: "rgba(154, 208, 75, 0.18)",
    pattern: "moss",
  },
  {
    name: "Frost Keep",
    accent: "#9bd4ff",
    accentStrong: "#5aa9ff",
    player: "#ffffff",
    goal: "#dff4ff",
    path: "#1d3146",
    wall: "#08111a",
    bgTop: "#1b2d42",
    bgBottom: "#060b12",
    panel: "rgba(10, 20, 32, 0.86)",
    panelBorder: "rgba(155, 212, 255, 0.18)",
    pattern: "snow",
  },
  {
    name: "Candy Vault",
    accent: "#ff8ad8",
    accentStrong: "#ff5fc1",
    player: "#fff0a8",
    goal: "#fff4ff",
    path: "#46213b",
    wall: "#160910",
    bgTop: "#39172f",
    bgBottom: "#11070e",
    panel: "rgba(34, 11, 28, 0.86)",
    panelBorder: "rgba(255, 138, 216, 0.18)",
    pattern: "confetti",
  },
  {
    name: "Void Station",
    accent: "#b288ff",
    accentStrong: "#8c5bff",
    player: "#f6e7ff",
    goal: "#efe3ff",
    path: "#231b3f",
    wall: "#090512",
    bgTop: "#1b1433",
    bgBottom: "#05030a",
    panel: "rgba(18, 11, 31, 0.86)",
    panelBorder: "rgba(178, 136, 255, 0.18)",
    pattern: "stars",
  },
  {
    name: "Volcano Core",
    accent: "#ff9640",
    accentStrong: "#ff5a36",
    player: "#ffe3a1",
    goal: "#fff4d6",
    path: "#452116",
    wall: "#150905",
    bgTop: "#38160f",
    bgBottom: "#120402",
    panel: "rgba(36, 13, 8, 0.86)",
    panelBorder: "rgba(255, 150, 64, 0.18)",
    pattern: "lava",
  },
  {
    name: "Deep Reef",
    accent: "#48e0c2",
    accentStrong: "#20bfa0",
    player: "#ffef9f",
    goal: "#dbfff8",
    path: "#14353a",
    wall: "#061114",
    bgTop: "#13343a",
    bgBottom: "#030b0c",
    panel: "rgba(7, 24, 26, 0.86)",
    panelBorder: "rgba(72, 224, 194, 0.18)",
    pattern: "bubbles",
  },
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

  return maze;
}

function addMazeLoops(maze, rng, loopChance) {
  const size = maze.length;

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (maze[y][x] !== 1 || rng() > loopChance) {
        continue;
      }

      const hasHorizontalPassage = maze[y][x - 1] === 0 && maze[y][x + 1] === 0;
      const hasVerticalPassage = maze[y - 1][x] === 0 && maze[y + 1][x] === 0;

      if (hasHorizontalPassage !== hasVerticalPassage) {
        maze[y][x] = 0;
      }
    }
  }
}

function findFarthestCell(maze, start) {
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);
  let currentIndex = 0;
  let farthest = start;

  while (currentIndex < queue.length) {
    const current = queue[currentIndex];
    currentIndex += 1;
    farthest = current;

    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
    ];

    neighbors.forEach((neighbor) => {
      const key = `${neighbor.x},${neighbor.y}`;
      if (maze[neighbor.y]?.[neighbor.x] !== 0 || visited.has(key)) {
        return;
      }

      visited.add(key);
      queue.push(neighbor);
    });
  }

  return farthest;
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

function getStageTheme(index) {
  const tier = Math.floor(index / 5);
  return stageThemes[tier % stageThemes.length];
}

function applyStageTheme(index) {
  const theme = getStageTheme(index);
  const root = document.documentElement;
  root.style.setProperty("--bg-top", theme.bgTop);
  root.style.setProperty("--bg-bottom", theme.bgBottom);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--panel-border", theme.panelBorder);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-strong", theme.accentStrong);
  root.style.setProperty("--path", theme.path);
  root.style.setProperty("--wall", theme.wall);
  root.style.setProperty("--player", theme.player);
  root.style.setProperty("--goal", theme.goal);
}

function fillPixelSquare(x, y, size, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(size), Math.ceil(size));
  ctx.globalAlpha = 1;
}

function drawStageBackdrop(theme, stage, cellSize) {
  const pixel = Math.max(2, Math.floor(cellSize / 3));
  const seed = stage.seed + state.stageIndex * 97;
  const rng = mulberry32(seed);

  ctx.fillStyle = theme.wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += pixel) {
    for (let x = 0; x < canvas.width; x += pixel) {
      const mix = (x + y) / (canvas.width + canvas.height);
      const alpha = 0.06 + mix * 0.08;
      fillPixelSquare(x, y, pixel, theme.path, alpha);
      if (rng() > 0.965) {
        fillPixelSquare(x, y, pixel, theme.accent, 0.22);
      }
    }
  }

  const decorations = Math.max(18, Math.floor(stage.size * 0.8));
  for (let index = 0; index < decorations; index += 1) {
    const x = Math.floor(rng() * canvas.width);
    const y = Math.floor(rng() * canvas.height);
    const size = pixel * (rng() > 0.78 ? 2 : 1);
    const alpha = 0.18 + rng() * 0.22;

    if (theme.pattern === "stars" || theme.pattern === "snow") {
      fillPixelSquare(x, y, size, "#ffffff", alpha);
    } else if (theme.pattern === "lava" || theme.pattern === "embers") {
      fillPixelSquare(x, y, size, theme.accentStrong, alpha);
    } else if (theme.pattern === "moss" || theme.pattern === "bubbles") {
      fillPixelSquare(x, y, size, theme.player, alpha);
    } else if (theme.pattern === "circuit") {
      fillPixelSquare(x, y, size, theme.accent, alpha);
      if (rng() > 0.5) {
        fillPixelSquare(x + size, y, size, theme.accentStrong, alpha * 0.7);
      }
    } else {
      fillPixelSquare(x, y, size, theme.goal, alpha);
    }
  }
}

function drawPathTexture(x, y, cellSize, theme, rng) {
  const inset = Math.max(1, Math.floor(cellSize * 0.18));
  const sparkle = Math.max(1, Math.floor(cellSize * 0.12));
  if (rng() > 0.52) {
    fillPixelSquare(x + inset, y + inset, sparkle, theme.goal, 0.08);
  }
  if (rng() > 0.7) {
    fillPixelSquare(x + cellSize - inset - sparkle, y + inset, sparkle, theme.accent, 0.1);
  }
}

function drawWallTexture(x, y, cellSize, theme, rng) {
  const crack = Math.max(1, Math.floor(cellSize * 0.14));
  fillPixelSquare(x, y, cellSize, theme.wall, 1);
  if (rng() > 0.35) {
    fillPixelSquare(x + crack, y + crack, crack, theme.accentStrong, 0.14);
  }
  if (rng() > 0.58) {
    fillPixelSquare(x + cellSize - crack * 2, y + crack, crack, theme.path, 0.2);
  }
  if (rng() > 0.74) {
    fillPixelSquare(x + crack, y + cellSize - crack * 2, crack, theme.goal, 0.08);
  }
}

function drawGoalMarker(cellSize, theme) {
  const x = state.goal.x * cellSize;
  const y = state.goal.y * cellSize;
  const inset = cellSize * 0.2;
  const core = cellSize * 0.6;
  const pixel = Math.max(2, Math.floor(cellSize * 0.14));

  ctx.fillStyle = theme.goal;
  ctx.fillRect(x + inset, y + inset, core, core);
  fillPixelSquare(x + inset, y + inset, pixel, theme.accentStrong, 0.8);
  fillPixelSquare(x + inset + core - pixel, y + inset, pixel, theme.accentStrong, 0.8);
  fillPixelSquare(x + inset, y + inset + core - pixel, pixel, theme.accentStrong, 0.8);
  fillPixelSquare(x + inset + core - pixel, y + inset + core - pixel, pixel, theme.accentStrong, 0.8);
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
  const stage = stages[state.stageIndex];
  const theme = getStageTheme(state.stageIndex);
  const rng = mulberry32(stage.seed * 31 + size);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStageBackdrop(theme, stage, cellSize);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixelX = x * cellSize;
      const pixelY = y * cellSize;
      if (state.maze[y][x] === 1) {
        drawWallTexture(pixelX, pixelY, cellSize, theme, rng);
      } else {
        ctx.fillStyle = theme.path;
        ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        drawPathTexture(pixelX, pixelY, cellSize, theme, rng);
      }
    }
  }

  drawGoalMarker(cellSize, theme);
  drawOtter(cellSize);
}

function setStage(index) {
  state.stageIndex = Math.max(0, Math.min(stages.length - 1, index));
  const stage = stages[state.stageIndex];
  const theme = getStageTheme(state.stageIndex);
  applyStageTheme(state.stageIndex);
  mazeSizeInput.value = String(stage.size);
  stageLabel.textContent = `${state.stageIndex + 1} / ${stages.length}`;
  stageList.querySelectorAll("button").forEach((button) => {
    const buttonIndex = Number(button.dataset.stage);
    button.classList.toggle("active", buttonIndex === state.stageIndex);
    button.classList.toggle("cleared", state.cleared.has(buttonIndex));
  });
  stageLabel.title = theme.name;
}

function resetGame() {
  const stage = stages[state.stageIndex];
  const rng = mulberry32(stage.seed);
  state.maze = buildMaze(stage.size, rng);
  addMazeLoops(state.maze, rng, stage.loopChance);
  state.player = { x: 1, y: 1 };
  state.goal = findFarthestCell(state.maze, state.player);
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
