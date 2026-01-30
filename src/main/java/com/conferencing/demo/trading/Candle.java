package com.conferencing.demo.trading;

public class Candle {
    public final double open, high, low, close, volume;

    public Candle(double o, double h, double l, double c, double v) {
        open = o; high = h; low = l; close = c; volume = v;
    }

    public double body() {
        return Math.abs(close - open);
    }

    public double upperWick() {
        return high - Math.max(open, close);
    }

    public double lowerWick() {
        return Math.min(open, close) - low;
    }
}

