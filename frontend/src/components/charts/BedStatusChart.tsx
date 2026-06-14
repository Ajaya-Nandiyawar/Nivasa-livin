"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Occupied", value: 142, color: "var(--color-success)" },
  { name: "Vacant", value: 35, color: "var(--color-primary)" },
  { name: "Reserved", value: 10, color: "var(--color-warning)" },
  { name: "Maintenance", value: 5, color: "var(--color-danger)" },
]

export function BedStatusChart() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Bed Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
                itemStyle={{ color: 'var(--color-foreground)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
