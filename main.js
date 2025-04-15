const canvas = new fabric.Canvas("c", { selection: false });
let bgImage = null;
let allData = [];

const bgInput = document.getElementById("bgUpload");
const excelInput = document.getElementById("excelUpload");
const titleInput = document.getElementById("titleInput");
const generateBtn = document.getElementById("generateBtn");
const statusDiv = document.getElementById("status");
const censorToggle = document.getElementById("censorToggle");


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
  const groupCount = Math.ceil(allData.length / 23);

  for (let i = 0; i < groupCount; i++) {
    const group = allData.slice(i * 23, (i + 1) * 23);
    drawPage(group, title);
    await delay(300);
    exportImage(i + 1);
  }
  statusDiv.innerText = `✅ 完成，共產生 ${groupCount} 張圖片。`;
});

function drawPage(group, title) {
  canvas.clear();
  if (bgImage) canvas.setBackgroundImage(bgImage, canvas.renderAll.bind(canvas));

  const map = POSITION_MAP;

  group.forEach((item, i) => {
    const pos = map[i];
    if (!pos) return;

    drawBirthColumn({
      year: item.年,
      month: item.月,
      day: item.日,
      hour: item.時
    }, pos.year, 21, 2, 6);

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
  if (item.day) parts.push(cleanNum(item.day), '號');
  if (item.hour) parts.push(cleanNum(item.hour), '時');

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

  // 👇 超過 15 行就縮小字體，最小縮到 14
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
    chars[i] = '○';
  }
  return chars.join('');
}

function censorAddress(address) {
  if (!address || address.length <= 7) return address;

  const visible = address.slice(0, 7);
  const rest = address.slice(7).split('');

  for (let i = 1; i < rest.length; i += 2) {
    rest[i] = '○';
  }

  return visible + rest.join('');
}