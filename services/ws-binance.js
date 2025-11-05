import chalk from "chalk";
import WebSocket from "ws";

let currentWs = null;
let currentSymbol = null;
let takerStats = { buy: "N/A", sell: "N/A", delta: "N/A", updatedAt: null };
let reconnectTimer = null;

export async function startBinanceFeed(symbol) {
    stopBinanceFeed();

    if (!symbol || !symbol.endsWith("USDT")) {
        console.log(chalk.gray(`⚠️ [WS] Bỏ qua symbol không hợp lệ: ${symbol}`));
        return;
    }

    const stream = `${symbol.toLowerCase()}@aggTrade`;
    const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);
    currentWs = ws;
    currentSymbol = symbol;

    let buyVol = 0, sellVol = 0;

    console.log(chalk.yellow(`📡 [WS] Connecting to Binance stream for ${symbol} ...`));

    ws.on("open", () => console.log(chalk.green(`[WS] ✅ Connected: ${symbol}`)));

    ws.on("message", (msg) => {
        try {
            const trade = JSON.parse(msg);
            const price = parseFloat(trade.p);
            const qty = parseFloat(trade.q);
            const vol = price * qty;
            if (!trade.m) buyVol += vol;
            else sellVol += vol;
        } catch (err) {
            console.error(chalk.red("⚠️ WS parse error:"), err.message);
        }
    });

    ws.interval = setInterval(() => {
        if (symbol !== currentSymbol) return;
        const delta = buyVol - sellVol;
        takerStats = {
            buy: buyVol.toFixed(2),
            sell: sellVol.toFixed(2),
            delta: delta.toFixed(2),
            updatedAt: new Date().toISOString(),
        };
        console.log(chalk.blue(`[Δ] ${symbol} → Buy=${takerStats.buy}  Sell=${takerStats.sell}  Δ=${takerStats.delta}`));
        buyVol = 0;
        sellVol = 0;
    }, 5000);

    ws.on("close", () => {
        console.log(chalk.red(`⚠️ WS closed for ${symbol}, reconnecting in 5s...`));
        if (symbol === currentSymbol) {
            reconnectTimer = setTimeout(() => startBinanceFeed(symbol), 5000);
        }
    });

    ws.on("error", (err) => {
        console.error(chalk.red(`❌ WS error for ${symbol}: ${err.message}`));
        ws.close();
    });
}

export function stopBinanceFeed() {
    if (currentWs) {
        console.log(chalk.magenta(`🛑 [WS] Stop feed for ${currentSymbol}`));
        if (currentWs.interval) clearInterval(currentWs.interval);
        currentWs.close();
        currentWs = null;
    }
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    currentSymbol = null;
}

export function getTakerStats() {
    return takerStats;
}
