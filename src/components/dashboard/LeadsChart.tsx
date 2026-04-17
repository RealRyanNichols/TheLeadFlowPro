"use client";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from "recharts";
import { MOCK_CHART } from "@/lib/mock-data";

export function LeadsChart() {
  return (
    <div className="glass rounded-2xl p-5 h-72">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white">Leads this week</h3>
          <p className="text-xs text-ink-300">All sources combined</p>
        </div>
        <span className="stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs">
          50 total
        </span>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={MOCK_CHART}>
          <defs>
            <linearGradient id="leadBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#23b8ff" />
              <stop offset="100%" stopColor="#0d4a9d" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222d46" />
          <XAxis dataKey="day" stroke="#65759b" fontSize={11} />
          <YAxis stroke="#65759b" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "#0a1124",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12
            }}
          />
          <Bar dataKey="leads" fill="url(#leadBar)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
