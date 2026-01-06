/**
 * Slot Engine - Core RNG Logic
 */

// สัญลักษณ์และน้ำหนัก (ยิ่งมากยิ่งออกบ่อย)
const SYMBOLS = [
    { symbol: '💎', name: 'Diamond', weight: 5, multiplier: { 3: 10, 4: 25, 5: 100 } },
    { symbol: '7️⃣', name: 'Seven', weight: 8, multiplier: { 3: 8, 4: 20, 5: 75 } },
    { symbol: '🍒', name: 'Cherry', weight: 15, multiplier: { 3: 5, 4: 12, 5: 50 } },
    { symbol: '🍋', name: 'Lemon', weight: 20, multiplier: { 3: 3, 4: 8, 5: 25 } },
    { symbol: '🍊', name: 'Orange', weight: 25, multiplier: { 3: 2, 4: 5, 5: 15 } },
    { symbol: '🍇', name: 'Grape', weight: 25, multiplier: { 3: 2, 4: 5, 5: 15 } },
    { symbol: '⭐', name: 'Wild', weight: 2, multiplier: { 3: 15, 4: 50, 5: 200 } },
];

export interface SpinResult {
    reels: string[][];
    winLines: WinLine[];
    totalWin: number;
    isWin: boolean;
}

export interface WinLine {
    line: number;
    symbols: string[];
    matchCount: number;
    multiplier: number;
    winAmount: number;
}

// สุ่มสัญลักษณ์ตามน้ำหนัก
function getRandomSymbol(): string {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const symbol of SYMBOLS) {
        random -= symbol.weight;
        if (random <= 0) {
            return symbol.symbol;
        }
    }

    return SYMBOLS[SYMBOLS.length - 1].symbol;
}

// สร้างวงล้อ 5x3
function generateReels(): string[][] {
    const reels: string[][] = [];
    for (let i = 0; i < 5; i++) {
        const reel: string[] = [];
        for (let j = 0; j < 3; j++) {
            reel.push(getRandomSymbol());
        }
        reels.push(reel);
    }
    return reels;
}

// ตรวจสอบแถวชนะ (แนวนอน 3 แถว)
function checkWinLines(reels: string[][], betAmount: number): WinLine[] {
    const winLines: WinLine[] = [];

    // ตรวจสอบ 3 แถวแนวนอน
    for (let row = 0; row < 3; row++) {
        const line = reels.map((reel) => reel[row]);
        const firstSymbol = line[0];

        // นับจำนวนที่ตรงกัน (รวม Wild)
        let matchCount = 1;
        for (let i = 1; i < 5; i++) {
            if (line[i] === firstSymbol || line[i] === '⭐' || firstSymbol === '⭐') {
                matchCount++;
            } else {
                break;
            }
        }

        // ต้องมีอย่างน้อย 3 ตัวตรงกัน
        if (matchCount >= 3) {
            const symbolInfo = SYMBOLS.find((s) => s.symbol === firstSymbol) || SYMBOLS[0];
            const multiplier = symbolInfo.multiplier[matchCount as 3 | 4 | 5] || 0;
            const winAmount = betAmount * multiplier;

            if (winAmount > 0) {
                winLines.push({
                    line: row,
                    symbols: line.slice(0, matchCount),
                    matchCount,
                    multiplier,
                    winAmount,
                });
            }
        }
    }

    return winLines;
}

// ปรับผลลัพธ์ตาม RTP
function adjustForRtp(reels: string[][], betAmount: number, targetRtp: number): string[][] {
    const currentResult = checkWinLines(reels, betAmount);
    const currentWin = currentResult.reduce((sum, line) => sum + line.winAmount, 0);
    const currentRtp = currentWin / betAmount;

    // ถ้า RTP สูงเกินไป ให้สุ่มใหม่ด้วยโอกาสบางส่วน
    if (currentRtp > targetRtp * 1.5) {
        const shouldReroll = Math.random() > targetRtp;
        if (shouldReroll) {
            return generateReels(); // สุ่มใหม่
        }
    }

    return reels;
}

// ฟังก์ชันหลัก: หมุนสล็อต
export function spinSlot(betAmount: number, rtp: number = 0.96): SpinResult {
    let reels = generateReels();
    reels = adjustForRtp(reels, betAmount, rtp);

    const winLines = checkWinLines(reels, betAmount);
    const totalWin = winLines.reduce((sum, line) => sum + line.winAmount, 0);

    return {
        reels,
        winLines,
        totalWin,
        isWin: totalWin > 0,
    };
}

export default { spinSlot, SYMBOLS };
