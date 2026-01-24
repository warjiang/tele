package main

import "testing"

func TestGetBWCounter(t *testing.T) {
	bwCounter, err := GetBWCounter("https://justmysocks6.net", "504873", "1d8efeb0-46fa-4c06-8d2e-631c551112f2")
	if err != nil {
		t.Errorf("Error: %s", err)
		return
	}
	t.Logf("MonthlyLimit: %d, Counter: %d, ResetDayOfMonth: %d", bwCounter.MonthlyLimit, bwCounter.Counter, bwCounter.ResetDayOfMonth)
}

func TestGetNextResetTime(t *testing.T) {
	GetNextResetTime()
}
