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
  const [monthlyApplications,setMonthlyApplications] = useState([]);

  const [riskGrades,setRiskGrades] = useState([]);
  const [riskScoreBuckets,setRiskScoreBuckets] = useState([]);
  const [riskRules,setRiskRules] = useState([]);
  const [riskScatter,setRiskScatter] = useState([]);

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


    /* ===============================
       MONTHLY APPLICATION TREND
    =============================== */

    const monthCounts = {};

    applications.forEach(app => {

      const date = new Date(app.created_at);
      const month = date.toLocaleString("default",{month:"short"});

      monthCounts[month] = (monthCounts[month] || 0) + 1;

    });

    const monthData = Object.entries(monthCounts).map(([month,value]) => ({
      month,
      value
    }));

    setMonthlyApplications(monthData);


    /* ===============================
       RISK GRADE DISTRIBUTION
    =============================== */

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


      /* ===============================
         RISK SCORE DISTRIBUTION
      =============================== */

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


      /* ===============================
         TOP TRIGGERED RULES
      =============================== */

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
        .sort((a, b) => b.count - a.count); // highest first

      setRiskRules(ruleData);


      /* ===============================
         RISK SCORE VS APPROVAL
      =============================== */

      const scatterData = reviewJobs.map(job => {

        const app = applications.find(a => a.application_id === job.application_id);

        return {
          risk_score: job.risk_score,
          approval: app?.current_status === "Approved" ? 1 : 0
        }

      });

      setRiskScatter(scatterData);

    }

  };

  fetchData();

}, []);

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
                                ? "hsl(var(--status-warning))"
                                : "hsl(var(--status-success))"
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

                      <Bar dataKey="autoRate" name="Auto Approved">
                        <LabelList
                          dataKey="autoRate"
                          formatter={(v)=>`${v.toFixed(1)}%`}
                          position="top"
                        />
                      </Bar>

                      <Bar dataKey="manualRate" name="Manual Review">
                        <LabelList
                          dataKey="manualRate"
                          formatter={(v)=>`${v.toFixed(1)}%`}
                          position="top"
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
                        label
                      />
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              {/* Monthly Applications */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications Trend</CardTitle>
                </CardHeader>

                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyApplications}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="month"/>
                      <YAxis/>
                      <Tooltip/>
                      <Line dataKey="value" strokeWidth={3}/>
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
                        label
                      />
                      <Tooltip/>
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
                        <LabelList dataKey="count" position="top"/>
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
                    <ScatterChart>
                      <CartesianGrid/>
                      <XAxis dataKey="risk_score"/>
                      <YAxis dataKey="approval"/>
                      <Tooltip/>
                      <Scatter data={riskScatter}/>
                    </ScatterChart>
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
