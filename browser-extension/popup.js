const $ = (id) => document.getElementById(id);
const send = (message) => chrome.runtime.sendMessage(message);
const time = (ms) => new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function line(label, value) {
    const row = document.createElement("div");
    row.className = "line";
    const a = document.createElement("span");
    a.textContent = label;
    const b = document.createElement("span");
    b.textContent = value;
    row.append(a, b);
    return row;
}

async function render() {
    const s = await send({ type: "status" });
    const box = $("status");
    box.replaceChildren();
    if (s.lastError === "needLogin") {
        const w = document.createElement("div");
        w.className = "warn";
        w.textContent = "Chưa đăng nhập: mở SuperApp (tungle.uk) trong trình duyệt này và đăng nhập, bot sẽ tự dùng phiên đó.";
        box.append(w);
    } else if (s.lastError) {
        const w = document.createElement("div");
        w.className = "warn";
        w.textContent = `Lỗi gần nhất: ${s.lastError}`;
        box.append(w);
    }
    box.append(line("Hôm nay", s.bank ? `${s.today.count}/${s.bank.maxPerDay} câu${s.today.disabled ? " · đã tắt" : ""}` : "—"));
    const next = s.next;
    box.append(line("Câu tiếp theo", !next ? "—" : next.ok ? "sẵn sàng (chờ lúc anh rảnh tay)" : next.nextAt ? `sau ${time(next.nextAt)}` : next.reason));
    box.append(line("Bộ câu hỏi", s.bank ? `${s.bank.count} câu · tải ${time(s.bank.loadedAt)}` : "chưa tải được"));
    if (s.usage) {
        const m = (sec) => Math.round(sec / 60);
        box.append(line("FB / Ins hôm nay", `${m(s.usage.facebook)}' / ${m(s.usage.instagram)}'`));
    }
    if (s.queueLength) box.append(line("Chưa gửi được", `${s.queueLength} câu trả lời (sẽ tự gửi lại)`));
    $("toggleToday").textContent = s.today.disabled ? "Bật lại hôm nay" : "Tắt hôm nay";
    $("toggleToday").dataset.disabled = s.today.disabled ? "1" : "";
    $("apiBase").value = s.settings.apiBase;
    $("trackerTaskId").value = s.settings.trackerTaskId;
    $("usageTaskId").value = s.settings.usageTaskId;
    $("deviceLabel").value = s.settings.deviceLabel;
}

const act = (fn) => async () => {
    const r = await fn();
    $("msg").textContent = r?.ok ? "Xong." : r?.reason ?? "Không được.";
    render();
};

$("askNow").addEventListener("click", act(() => send({ type: "askNow" })));
$("toggleToday").addEventListener("click", act(() => send({ type: "setDisabledToday", disabled: !$("toggleToday").dataset.disabled })));
$("refreshBank").addEventListener("click", act(() => send({ type: "refreshBank" })));
$("save").addEventListener("click", act(() => send({
    type: "saveSettings",
    settings: {
        apiBase: $("apiBase").value,
        trackerTaskId: Number($("trackerTaskId").value),
        usageTaskId: Number($("usageTaskId").value),
        deviceLabel: $("deviceLabel").value.trim(),
    },
})));

render();
