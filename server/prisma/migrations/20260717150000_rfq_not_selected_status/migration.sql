-- RFQ group accept flow: non-winning sellers become NOT_SELECTED (not DECLINED).
ALTER TYPE "QuoteRequestStatus" ADD VALUE IF NOT EXISTS 'NOT_SELECTED';
