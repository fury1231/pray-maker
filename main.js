const canvas = new fabric.Canvas("c", { selection: false });
let bgImage = null;
let allData = [];

const bgInput = document.getElementById("bgUpload");
const excelInput = document.getElementById("excelUpload");
const titleInput = document.getElementById("titleInput");
const generateBtn = document.getElementById("generateBtn");
const statusDiv = document.getElementById("status");
const censorToggle = document.getElementById("censorToggle");
const hideDayHourToggle = document.getElementById("hideDayHourToggle");

let currentMode = "mode1"; // 預設選擇為mode1
const modeSelector = document.getElementById("modeSelector");  // 切換產圖模式
modeSelector.addEventListener("change", (e) => {
  currentMode = e.target.value;
});


const NAME_OFFSET_X = -10;

bgInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (evt) {
    fabric.Image.fromURL(evt.target.result, (img) => {
      bgImage = img;
      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
  };
  reader.readAsDataURL(file);
});

excelInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    allData = XLSX.utils.sheet_to_json(sheet);
    statusDiv.innerText = `已讀取 ${allData.length} 筆資料`;
  };
  reader.readAsArrayBuffer(file);
});

generateBtn.addEventListener("click", async () => {
  const title = "";

  const pageSize = currentMode === "mode2" ? 22 : 23; // 重點：依模式設定每頁幾筆
  const groupCount = Math.ceil(allData.length / pageSize); // 用 pageSize 計算頁數

  for (let i = 0; i < groupCount; i++) {
    const group = allData.slice(i * pageSize, (i + 1) * pageSize); // 切出每頁的資料
    drawPage(group, title);
    await delay(300);
    exportImage(i + 1);
  }

  statusDiv.innerText = `✅ 完成，共產生 ${groupCount} 張圖片。`;
});

function drawPage(group, title) {

  canvas.clear();
  if (bgImage) canvas.setBackgroundImage(bgImage, canvas.renderAll.bind(canvas));

  const map = POS_MAP[currentMode];

  group.forEach((item, i) => {
    const pos = map[i];
    if (!pos) return;
    if (currentMode === "mode1") {
    drawBirthColumn({
      year: item.年,
      month: item.月,
      day: item.日,
      hour: item.時
    }, pos.year, 21, 2, 6);
    }
    const nameText = censorToggle.checked ? censorName(item.姓名 || "") : item.姓名 || "";
    canvas.add(new fabric.Text(toVertical(nameText), {
      left: pos.name[0] + NAME_OFFSET_X,
      top: pos.name[1] - 5,
      fontSize: 33,
      fontFamily: "標楷體",
      fill: "black",
      originX: "left",
      originY: "top",
      textAlign: "left",
      lineHeight:1 // 調整姓名每個字的距離

    }));

    const addressText = censorToggle.checked ? censorAddress(item.地址 || "") : item.地址 || "";
    drawAddressSmartVertical(addressText, pos.address, 25);
  });

  canvas.renderAll();
}

function drawBirthColumn(item, [x, y], fontSize = 18, spacing = 2, offsetY = 5) {
  const parts = [];

  const cleanNum = (val) => String(val).replace(/[年月日號时时]/g, '');

  if (item.year) parts.push(cleanNum(item.year), '年');
  if (item.month) parts.push(cleanNum(item.month), '月');
  if (!hideDayHourToggle.checked) {
    if (item.day) parts.push(cleanNum(item.day), '日');
    if (item.hour) parts.push(cleanNum(item.hour), '時');
  }

  const fullText = parts.join('\n');
  const textHeight = parts.length * fontSize + (parts.length - 1) * spacing;
  const topY = y - textHeight / 2 + offsetY;

  canvas.add(new fabric.Text(fullText, {
    left: x,
    top: topY,
    fontSize,
    fontFamily: "標楷體",
    fill: "black",
    originX: "center",
    originY: "top",
    textAlign: "center",
    lineHeight: 1
  }));
}

function toVerticalAddress(text) {
  if (!text) return "";

  const result = [];
  const regex = /([0-9０-９]+)([號樓巷弄室之])/g;
  let lastIndex = 0;

  // 將數字+單位區塊獨立處理
  text.replace(regex, (match, num, unit, offset) => {
    const before = text.slice(lastIndex, offset);
    result.push(...before.split('')); // 逐字推入前面的中文
    result.push(num);  // 數字整串放入
    result.push(unit); // 單位一個字
    lastIndex = offset + match.length;
    return match;
  });

  // 處理最後剩下的字（若沒有被 regex 吃到）
  if (lastIndex < text.length) {
    result.push(...text.slice(lastIndex).split(''));
  }

  return result.join('\n');
}


function drawAddressSmartVertical(text, [x, y], baseFontSize = 25) {
  if (!text) return;

  const verticalText = toVerticalAddress(text);
  const lineCount = verticalText.split('\n').length;

  // 超過 15 行就縮小字體，最小縮到 14
  const fontSize = lineCount > 15
    ? Math.max(14, Math.floor(baseFontSize * 15 / lineCount))
    : baseFontSize;

  canvas.add(new fabric.Text(verticalText, {
    left: x,
    top: y,
    fontSize,
    fontFamily: "標楷體",
    fill: "black",
    originX: "center",
    originY: "top",
    textAlign: "center",
    lineHeight: 1
  }));
}

function toVertical(text) {
  if (!text) return "";
  return String(text)
    .replace(/([0-9０-９]{1,3})(號|樓|巷|弄|室|之)/g, "$1\n$2")
    .split('')
    .join('\n');
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function exportImage(index) {
  const a = document.createElement("a");
  a.download = `page_${index}.png`;
  a.href = canvas.toDataURL({ format: "png" });
  a.click();
}

function censorName(name) {
  if (!name) return "";
  const chars = name.split('');
  for (let i = 1; i < chars.length; i += 2) {
    chars[i] = '＊';
  }
  return chars.join('');
}

function censorAddress(address) {
  if (!address || address.length <= 7) return address;

  const visible = address.slice(0, 7);
  const rest = address.slice(7).split('');

  for (let i = 1; i < rest.length; i += 2) {
    rest[i] = '＊';
  }

  return visible + rest.join('');
}


canvas.on("mouse:down", function (options) {
  if (options.e.button === 2) return; // 忽略右鍵

  const pointer = canvas.getPointer(options.e);
  const x = Math.round(pointer.x);
  const y = Math.round(pointer.y);

  const circle = new fabric.Circle({
    left: x,
    top: y,
    radius: 4,
    fill: 'red',
    originX: 'center',
    originY: 'center'
  });

  const label = new fabric.Text(`(${x},${y})`, {
    left: x + 10,
    top: y - 10,
    fontSize: 12,
    fill: 'red',
    fontFamily: 'monospace',
    originX: 'left',
    originY: 'top'
  });

  const group = new fabric.Group([circle, label], {
    left: x,
    top: y,
    hasControls: false,
    hasBorders: false,
    selectable: true
  });

  canvas.add(group);
  canvas.renderAll();
});

canvas.upperCanvasEl.addEventListener("contextmenu", function (e) {
  e.preventDefault(); // 防止瀏覽器右鍵選單

  const pointer = canvas.getPointer(e);

  // 取得滑鼠點擊位置下的物件（Group）
  const target = canvas.findTarget(e, false);

  if (target && target.type === "group") {
    canvas.remove(target);
    canvas.renderAll();
  }
});