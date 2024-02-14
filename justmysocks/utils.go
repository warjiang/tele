package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type BWCounter struct {
	MonthlyLimit    int64 `json:"monthly_bw_limit_b"`
	Counter         int64 `json:"bw_counter_b"`
	ResetDayOfMonth int64 `json:"bw_reset_day_of_month"`
}

func GetBWCounter(baseUrl, serviceId, id string) (*BWCounter, error) {
	url := fmt.Sprintf("%s/members/getbwcounter.php?service=%s&id=%s", baseUrl, serviceId, id)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	bwCounter := &BWCounter{}
	err = json.Unmarshal(body, bwCounter)
	if err != nil {
		return nil, err
	}
	return bwCounter, nil
}

func GetNextResetTime() (*time.Time, error) {
	laLocation, err := time.LoadLocation("America/Los_Angeles")
	if err != nil {
		log.Printf("Error loading Los Angeles time zone:%+v", err)
		return nil, err
	}
	shanghaiLocation, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		log.Printf("Error loading Shanghai time zone:%+v", err)
		return nil, err
	}
	// reset traffic at every 12th day of the month at 00:00:00 in los angeles time zone
	shanghaiNow := time.Now().In(shanghaiLocation)
	losAngeles12thDay := time.Date(
		shanghaiNow.Year(), shanghaiNow.Month(), 12, 0, 0, 0, 0,
		laLocation,
	)
	losAngelesNext12thDay := losAngeles12thDay.AddDate(0, 1, 0)
	shanghaiNext12thDay := losAngelesNext12thDay.In(shanghaiLocation)
	// fmt.Printf("shanghai12thDay: %+v\n", shanghai12thDay)
	return &shanghaiNext12thDay, nil
}
