import { useState,useEffect  } from "react";
import {
  KPICard,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { mockKPIData } from "../data/mockData";
import { supabase } from "../data/supabaseClient"; // your Supabase client
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Legend
} from "recharts";
import {
  Clock,
  Zap,
  FileWarning,
  TrendingDown,
  AlertTriangle,
  Target,
} from "lucide-react";

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [applications,setApplications] = useState([]);
  const [stpRate,setStpRate] = useState(0);

  const [applicationsByStatus,setApplicationsByStatus] = useState([]);
  const [manualReviewData,setManualReviewData] = useState([]);

  const [applicationsByCountry,setApplicationsByCountry] = useState([]);
  const [applicationsByBusinessType,setApplicationsByBusinessType] = useState([]);
  const [conversionRates,setConversionRates] = useState([]);
  const [processingTime, setProcessingTime] = useState([]);

  const [riskGrades,setRiskGrades] = useState([]);
  const [riskScoreBuckets,setRiskScoreBuckets] = useState([]);
  const [riskRules,setRiskRules] = useState([]);
  const [riskApproval, setRiskApproval] = useState([]);

  // KPI mock data (keep your existing mock for other KPIs)
 

  // Fetch Conversion Rates & Applications by Country
  useEffect(() => {
  const fetchData = async () => {

    // Fetch applications
    const { data: applications, error } = await supabase
      .from("application_form")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    // Fetch risk jobs
    const { data: reviewJobs, error: riskError } = await supabase
      .from("reviewJobs")
      .select("*");

    if (riskError) {
      console.error(riskError);
    }

    setApplications(applications);

    /* ===============================
       STP RATE
    =============================== */

    const autoApproved = applications.filter(
      a => a.previous_status !== "Under Review" &&
           a.current_status === "Approved"
    );

    const stpRate = (autoApproved.length / applications.length) * 100;
    setStpRate(stpRate);


    /* ===============================
       APPLICATIONS BY STATUS
    =============================== */

    const statusCounts = {};

    applications.forEach(app => {
      const status = app.current_status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([name,value]) => ({
      name,
      value
    }));

    setApplicationsByStatus(statusData);


    /* ===============================
       MANUAL REVIEW LOAD
    =============================== */

    const manual = applications.filter(
      a => a.previous_status === "Under Review"
    ).length;

    const auto = applications.length - manual;

    setManualReviewData([
      { name:"Manual Review", value:manual },
      { name:"Auto Processing", value:auto }
    ]);


    /* ===============================
       APPLICATIONS BY COUNTRY
    =============================== */

    const countryCounts = {};

    applications.forEach(app => {
      const country = app.business_country || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    const countryData = Object.entries(countryCounts).map(([name,value]) => ({
      name,
      value
    }));

    setApplicationsByCountry(countryData);


    /* ===============================
       CONVERSION RATE BY BUSINESS TYPE
    =============================== */

    const grouped = {};

    applications.forEach(app => {

      const type = app.business_type || "Unknown";

      if(!grouped[type]){
        grouped[type] = {
          autoTotal:0,
          autoApproved:0,
          manualTotal:0,
          manualApproved:0
        }
      }

      if(app.previous_status === "Under Review"){

        grouped[type].manualTotal++

        if(app.current_status === "Approved"){
          grouped[type].manualApproved++
        }

      } else {

        grouped[type].autoTotal++

        if(app.current_status === "Approved"){
          grouped[type].autoApproved++
        }

      }

    });

    const conversionData = Object.keys(grouped).map(type => ({

      business_type:type,

      autoRate:
        grouped[type].autoTotal === 0
        ? 0
        : (grouped[type].autoApproved / grouped[type].autoTotal) * 100,

      manualRate:
        grouped[type].manualTotal === 0
        ? 0
        : (grouped[type].manualApproved / grouped[type].manualTotal) * 100

    }));

    setConversionRates(conversionData);


    /* ===============================
       APPLICATIONS BY BUSINESS TYPE
    =============================== */

    const typeCounts = {};

    applications.forEach(app => {
      const type = app.business_type || "Unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const typeData = Object.entries(typeCounts).map(([name,value]) => ({
      name,
      value
    }));

    setApplicationsByBusinessType(typeData);


    /* APPLICATION PROCESSING TIME */

        const processingByMonth = {};

        reviewJobs.forEach(job => {

          if (!job.completed_at) return;

          const app = applications.find(
            a => a.application_id === job.application_id
          );

          if (!app) return;

          const created = new Date(app.created_at);
          const completed = new Date(job.completed_at);

          const diffDays = (completed - created) / (1000 * 60 * 60 * 24);

          const month = created.toLocaleString("default", { month: "short" });

          if (!processingByMonth[month]) {
            processingByMonth[month] = {
              totalDays: 0,
              count: 0
            };
          }

          processingByMonth[month].totalDays += diffDays;
          processingByMonth[month].count += 1;

        });

        const processingData = Object.entries(processingByMonth).map(
          ([month, data]) => ({
            month,
            value: data.totalDays / data.count // avg days
          })
        );

      setProcessingTime(processingData);

    /* RISK GRADE DISTRIBUTION */

    if(reviewJobs){

      const gradeCounts = {};

      reviewJobs.forEach(job => {

        const grade = job.risk_grade || "Unknown";

        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

      });

      const gradeData = Object.entries(gradeCounts).map(([name,value]) => ({
        name,
        value
      }));

      setRiskGrades(gradeData);


      /* RISK SCORE DISTRIBUTION*/

      const buckets = {
        "0-20":0,
        "21-40":0,
        "41-60":0,
        "61-80":0,
        "81-100":0
      };

      reviewJobs.forEach(job => {

        const score = job.risk_score || 0;

        if(score <=20) buckets["0-20"]++
        else if(score <=40) buckets["21-40"]++
        else if(score <=60) buckets["41-60"]++
        else if(score <=80) buckets["61-80"]++
        else buckets["81-100"]++

      });

      const bucketData = Object.entries(buckets).map(([range,count])=>({
        range,
        count
      }));

      setRiskScoreBuckets(bucketData);


      /* TOP TRIGGERED RULES*/

      const ruleCounts = {};

      reviewJobs.forEach(job => {

        if (!job.rules_triggered) return;

        let rules = [];

        try {
          rules = typeof job.rules_triggered === "string"
            ? JSON.parse(job.rules_triggered)
            : job.rules_triggered;
        } catch (err) {
          console.error("Invalid rules_triggered JSON:", err);
          return;
        }

        rules.forEach(rule => {

          const name = rule.description;

          if (!name) return;

          ruleCounts[name] = (ruleCounts[name] || 0) + 1;

        });

      });

      const ruleData = Object.entries(ruleCounts)
        .map(([name, count]) => ({
          name,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // ✅ only top 5 // highest first

      setRiskRules(ruleData);


      /*RISK SCORE VS APPROVAL */

        const bucketsAppr = {
          "0-20": { approved: 0, rejected: 0 },
          "21-40": { approved: 0, rejected: 0 },
          "41-60": { approved: 0, rejected: 0 },
          "61-80": { approved: 0, rejected: 0 },
          "81-100": { approved: 0, rejected: 0 }
        };

        reviewJobs.forEach(job => {

          const app = applications.find(
            a => a.application_id === job.application_id
          );

          if (!app) return;

          const score = job.risk_score || 0;

          let bucket = "";

          if (score <= 20) bucket = "0-20";
          else if (score <= 40) bucket = "21-40";
          else if (score <= 60) bucket = "41-60";
          else if (score <= 80) bucket = "61-80";
          else bucket = "81-100";

          if (app.current_status === "Approved") {
            bucketsAppr[bucket].approved++;
          } else {
            bucketsAppr[bucket].rejected++;
          }

        });

        const riskApprovalData = Object.entries(bucketsAppr).map(
          ([range, values]) => {
            const total = values.approved + values.rejected;

            return {
              range,
              approved: values.approved,
              rejected: values.rejected,
              approvalRate: total === 0 ? 0 : (values.approved / total) * 100,
              rejectedRate: total === 0 ? 0 : (values.rejected / total) * 100
            };
          }
        );

        setRiskApproval(riskApprovalData);

    }

  };

  fetchData();

}, []);

const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // yellow
  "#ef4444", // red
  "#8b5cf6"  // purple
];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor onboarding performance and operational efficiency
            </p>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="quarterly">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

       <Tabs defaultValue="tab1">

          <TabsList className="mb-6">
            <TabsTrigger value="tab1">Overview</TabsTrigger>
            <TabsTrigger value="tab2">Applications</TabsTrigger>
            <TabsTrigger value="tab3">Risk</TabsTrigger>
          </TabsList>

          {/* TAB 1 */}
          <TabsContent value="tab1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Total Applications */}
              <Card>
                <CardHeader>
                  <CardTitle>Total Applications</CardTitle>
                </CardHeader>
                <CardContent className="text-4xl font-bold text-center">
                  {applications?.length || 0}
                </CardContent>
              </Card>

              {/* STP Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>STP Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-4xl font-bold text-center">
                  {stpRate?.toFixed(1)}%
                </CardContent>
              </Card>

              {/* Applications by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications by Status</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={applicationsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {applicationsByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Approved"
                                ? "#22c55e"
                                : entry.name === "Rejected"
                                ? "#ef4444"
                                : entry.name === "Under Review"
                                ? "#f59e0b"
                                : entry.name === "Under Manual Review"
                                ? "#3b82f6"
                                : "#94a3b8" 
                            }
                          />
                        ))}
                        <LabelList dataKey="value" position="top"/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Manual Review Load */}
              <Card>
                <CardHeader>
                  <CardTitle>Manual Review Load</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={manualReviewData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {manualReviewData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Manual Review"
                                ? "#22c55e"
                                : "#ef4444"
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* TAB 2 */}
          <TabsContent value="tab2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Applications by Country */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications by Country</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={applicationsByCountry}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="name"/>
                      <YAxis/>
                      <Tooltip/>
                      <Bar dataKey="value">
                        {applicationsByCountry.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "Indonesia"
                              ? "#22c55e"
                              : entry.name === "SG"
                              ? "#ef4444"
                              : entry.name === "ID"
                              ? "#f59e0b"
                              : entry.name === "Singapore"
                              ? "#3b82f6"
                              : "#94a3b8" // fallback (grey)
                          }
                        />
                      ))}
                        <LabelList dataKey="value" position="top"/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Conversion Rate by Business Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate by Business Type</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionRates}>
                      <CartesianGrid strokeDasharray="3 3"/>

                      <XAxis
                        dataKey="business_type"
                        tickFormatter={(v) =>
                          v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())
                        }
                      />

                      <YAxis domain={[0,100]}/>

                      <Tooltip formatter={(v)=>`${v.toFixed(1)}%`} />

                      <Bar dataKey="autoRate" name="Auto Approved" fill="#22c55e">
                        <LabelList
                          dataKey="autoRate"
                          formatter={(v)=>`${v.toFixed(1)}%`}
                          position="top"
                          fill="#22c55e"
                        />
                      </Bar>

                      <Bar dataKey="manualRate" name="Manual Review" fill="#ef4444">
                        <LabelList
                          dataKey="manualRate"
                          formatter={(v)=>`${v.toFixed(1)}%`}
                          position="top"
                          fill="#ef4444"
                        />
                      </Bar>

                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Applications by Business Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications by Business Type</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>

                      <Pie
                        data={applicationsByBusinessType}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name.replaceAll("_", " ")}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {applicationsByBusinessType.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={[
                              "#22c55e",
                              "#ef4444",
                              "#f59e0b",
                            ][index % 5]}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name.replaceAll("_", " "),
                        ]}
                      />

                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) =>
                          value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        }
                      />

                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Applications processing time */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Processing Time</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processingTime}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="month" />

                      <YAxis
                        label={{ value: "Days", angle: -90, position: "insideLeft" }}
                      />

                      <Tooltip
                        formatter={(v) => `${v.toFixed(1)} days`}
                      />

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--accent))"
                        strokeWidth={3}
                        dot
                      >
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(v) => `${v.toFixed(1)}`}
                        />
                      </Line>

                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>
          </TabsContent>


          {/* TAB 3 */}
          <TabsContent value="tab3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Risk Grade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Grade Distribution</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>

                      <Pie
                        data={riskGrades}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {riskGrades.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Simplified CDD"
                                ? "#22c55e"
                                : entry.name === "Standard CDD"
                                ? "#f59e0b"
                                : "#ef4444"
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip />

                      <Legend verticalAlign="bottom" height={36} />

                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Risk Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Score Distribution</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskScoreBuckets}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="range"/>
                      <YAxis/>
                      <Tooltip/>
                      <Bar dataKey="count">
                        {riskScoreBuckets.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}

                        <LabelList dataKey="count" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Top Risk Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Triggered Risk Rules</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskRules}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />

                      <YAxis />

                      <Tooltip />

                      <Bar dataKey="count">
                        {riskRules.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}

                        <LabelList dataKey="count" position="top" />
                      </Bar>

                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Risk Score vs Approval */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Score vs Approval</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskApproval}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="range" />

                      <YAxis />

                      <Tooltip />

                      <Legend />

                      <Bar
                        dataKey="approved"
                        stackId="a"
                        fill="#22c55e"   // ✅ force green (see fix below)
                      >
                        <LabelList
                          dataKey="approvalRate"
                          position="top"
                          formatter={(v) => `${v.toFixed(0)}%`}
                        />
                      </Bar>

                      <Bar
                        dataKey="rejected"
                        stackId="a"
                        fill="#ef4444"
                      >
                        <LabelList
                          dataKey="rejectedRate"
                          position="top"
                          formatter={(v) => `${v.toFixed(0)}%`}
                        />
                      </Bar>

                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
