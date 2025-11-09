import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customWorkouts, workoutLogs } from "@/lib/data";
import { format } from "date-fns";

export default function DashboardPage() {
  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Start Workout</CardTitle>
            <CardDescription>
              Select one of your custom workouts to begin a session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a workout" />
                </SelectTrigger>
                <SelectContent>
                  {customWorkouts.map((workout) => (
                    <SelectItem key={workout.id} value={workout.id}>
                      {workout.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button asChild>
                <Link href="/workout/1">Start Session</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>Total Volume</CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">20,500 lbs</div>
                <p className="text-xs text-muted-foreground">+15% from last week</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle>Workouts</CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">2</div>
                 <p className="text-xs text-muted-foreground">On track for your goal of 3</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle>Time Spent</CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">120 min</div>
                <p className="text-xs text-muted-foreground">+20 min from last week</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            A log of your most recent workouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workout</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                <TableHead className="text-right">Total Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.slice(0, 5).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="font-medium">{log.workoutName}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(new Date(log.date), "PPP")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {log.duration}
                  </TableCell>
                  <TableCell className="text-right">{log.volume.toLocaleString()} lbs</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
