"use client";
import { useCallback } from "react";
import { formatMoney } from "@/utils/money";
export function useMoneyFormatter(){ return useCallback((amountMinor:number)=>formatMoney(amountMinor),[]); }
