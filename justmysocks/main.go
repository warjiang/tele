package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	addr      = flag.String("listen-address", ":2112", "The address to listen on for HTTP requests.")
	baseURL   = flag.String("base-url", "https://justmysocks6.net", "The base URL for justmysocks")
	serviceId = flag.String("service-id", "", "The service ID for justmysocks")
	token     = flag.String("token", "", "The token for justmysocks")
	bwCounter = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "justmysocks_bw_counter",
		Help: "Used bandwidth counter for justmysocks",
	})
)

func recordMetrics() {
	go func() {
		for {
			counter, err := GetBWCounter(*baseURL, *serviceId, *token)
			if err == nil {
				bwCounter.Set(float64(counter.Counter))
			}
			time.Sleep(10 * time.Second)
		}
	}()
}

func info(w http.ResponseWriter, r *http.Request) {
	counter, err := GetBWCounter(*baseURL, *serviceId, *token)
	if err != nil {
		w.Write([]byte(err.Error()))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	counterMap := map[string]interface{}{
		"monthly_bw_limit_b":    counter.MonthlyLimit,
		"bw_counter_b":          counter.Counter,
		"bw_reset_day_of_month": counter.ResetDayOfMonth,
	}
	/*
		counters := []*BWCounter{counter}
		buff, err := json.Marshal(counters)
		if err != nil {
			w.Write([]byte(err.Error()))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Write(buff)
	*/
	queryParams := r.URL.Query()
	// queryField := queryParams.Get("field")
	queryField := queryParams["field"]

	fields := queryField
	if len(queryField) == 0 || queryField[0] == "*" || queryField[0] == "" {
		fields = []string{"monthly_bw_limit_b", "bw_counter_b", "bw_reset_day_of_month", "next_renew_date"}
	}
	log.Printf("fields: %+v\n", fields)

	selectedCounterMap := make(map[string]interface{})
	for _, field := range fields {
		if field == "next_renew_date" {
			nextRenewDate, err := GetNextResetTime()
			if err == nil {
				selectedCounterMap[field] = nextRenewDate.Format("2006-01-02T15:04:05Z07:00")
			}
			continue
		}
		if v, ok := counterMap[field]; ok {
			selectedCounterMap[field] = v
		}
	}
	counters := []map[string]interface{}{selectedCounterMap}
	buff, err := json.Marshal(counters)
	if err != nil {
		w.Write([]byte(err.Error()))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(buff)
}

/*
http://justmysocks:2112/info
field=monthly_bw_limit_b
field=bw_counter_b
field=bw_reset_day_of_month
field=next_renew_date
*/
func main() {
	flag.Parse()
	if *serviceId == "" {
		panic("service-id is required")
	}
	if *token == "" {
		panic("token is required")
	}
	recordMetrics()
	log.Printf("Starting server at %s\n", *addr)
	http.Handle("/metrics", promhttp.Handler())
	http.HandleFunc("/info", info)
	http.ListenAndServe(*addr, nil)
}
