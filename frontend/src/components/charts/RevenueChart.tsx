"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Jan", expected: 400000, collected: 380000 },
  { name: "Feb", expected: 400000, collected: 390000 },
  { name: "Mar", expected: 420000, collected: 400000 },
  { name: "Apr", expected: 420000, collected: 415000 },
  { name: "May", expected: 450000, collected: 430000 },
  { name: "Jun", expected: 450000, collected: 420000 },
]

export function RevenueChart() {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              {/* Using CSS variables for colors */}
              <Bar dataKey="expected" name="Expected Rent" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected Rent" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
