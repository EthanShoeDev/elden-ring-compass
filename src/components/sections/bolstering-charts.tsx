// import { Bar, BarChart, CartesianGrid, Cell, LabelList } from 'recharts';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from '@/components/ui/chart';

// const chartData = [
//   { powerLvl: 1, count: 0 },
//   { powerLvl: 2, count: 3 },
//   { powerLvl: 3, count: 0 },
//   { powerLvl: 4, count: -2 },
//   { powerLvl: 5, count: 0 },
//   { powerLvl: 6, count: 0 },
//   { powerLvl: 7, count: 0 },
//   { powerLvl: 8, count: 0 },
//   { powerLvl: 9, count: 0 },
// ];

// const chartConfig = {
//   count: {
//     label: 'Count',
//   },
//   powerLvl: {
//     label: 'Power Level',
//   },
// } satisfies ChartConfig;

// export function BolsteringCharts() {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Bar Chart - Negative</CardTitle>
//         <CardDescription>January - June 2024</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <ChartContainer config={chartConfig}>
//           <BarChart accessibilityLayer data={chartData}>
//             <CartesianGrid vertical={false} />
//             <ChartTooltip
//               cursor={false}
//               content={<ChartTooltipContent hideLabel hideIndicator />}
//             />
//             <Bar dataKey="visitors">
//               <LabelList position="top" dataKey="month" fillOpacity={1} />
//               {chartData.map((item) => (
//                 <Cell
//                   key={item.powerLvl}
//                   fill={
//                     item.count > 0
//                       ? 'hsl(var(--chart-1))'
//                       : 'hsl(var(--chart-2))'
//                   }
//                 />
//               ))}
//             </Bar>
//           </BarChart>
//         </ChartContainer>
//       </CardContent>
//       <CardFooter className="flex-col items-start gap-2 text-sm">
//         <div className="flex gap-2 font-medium leading-none">
//           Trending up by 5.2% this month
//         </div>
//         <div className="leading-none text-muted-foreground">
//           Showing total visitors for the last 6 months
//         </div>
//       </CardFooter>
//     </Card>
//   );
// }
