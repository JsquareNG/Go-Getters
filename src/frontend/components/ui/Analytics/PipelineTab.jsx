import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../primitives/Card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../primitives/chart";
import { pipelineStages, rejectionReasons } from "@/data/mockAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

const maxCount = Math.max(...pipelineStages.map((s) => s.count));

const rejectionChartConfig = {
  count: {
    label: "Count",
    color: "hsl(351, 85%, 49%)",
  },
};

export function PipelineTab() {
  const funnelData = [
    { name: "Started", value: 247, fill: "hsl(210, 100%, 50%)" },
    { name: "Submitted", value: 175, fill: "hsl(262, 83%, 58%)" },
    { name: "In Review", value: 148, fill: "hsl(38, 92%, 50%)" },
    { name: "Approved", value: 115, fill: "hsl(142, 71%, 45%)" },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Current Pipeline</CardTitle>
          <CardDescription>
            Applications at each stage of the onboarding process
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {pipelineStages.map((stage) => (
              <div key={stage.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stage.stage}</span>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Avg {stage.avgDays > 0 ? `${stage.avgDays} days` : "—"}
                    </span>
                    <span className="w-8 text-right font-semibold tabular-nums text-foreground">
                      {stage.count}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(stage.count / maxCount) * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Conversion Funnel</CardTitle>
            <CardDescription>Drop-off at each stage (last 30 days)</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const dropoff =
                  i > 0
                    ? (
                        ((funnelData[i - 1].value - stage.value) /
                          funnelData[i - 1].value) *
                        100
                      ).toFixed(1)
                    : null;

                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{stage.name}</span>

                      <div className="flex items-center gap-2">
                        {dropoff && (
                          <span className="text-xs text-status-requires-action">
                            -{dropoff}%
                          </span>
                        )}
                        <span className="font-semibold tabular-nums text-foreground">
                          {stage.value}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(stage.value / funnelData[0].value) * 100}%`,
                          backgroundColor: stage.fill,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rejection Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Top Rejection Reasons</CardTitle>
            <CardDescription>
              Primary reasons applications are declined
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ChartContainer config={rejectionChartConfig} className="h-[260px] w-full">
              <BarChart data={rejectionReasons} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />

                <YAxis
                  dataKey="reason"
                  type="category"
                  width={150}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />

                <ChartTooltip content={<ChartTooltipContent />} />

                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
                  {rejectionReasons.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0
                          ? "hsl(351, 85%, 49%)"
                          : "hsl(351, 85%, 49%, 0.6)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}