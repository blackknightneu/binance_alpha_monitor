export interface Account {
    id: string;
    name: string;
    balance: number;
    lastUpdated: Date;
    pointsHistory: PointsRecord[];
    lastLogin?: Date;
    riskDate?: Date;
}

export interface PointsRecord {
    date: Date;
    balance: number;       // Main balance for points calculation
    startBalance: number;  // Day start balance for P&L
    endBalance: number;    // Day end balance for P&L
    volumePoints: number;
    balancePoints: number;
    totalPoints: number;
    volume: number;
    // optional fields for daily profit collected and any points deducted manually
    profit?: number;
    deductedPoints?: number;
}