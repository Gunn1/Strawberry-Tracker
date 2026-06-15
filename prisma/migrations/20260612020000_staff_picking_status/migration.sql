-- Add a "Staff picking" row status (for rows staff are harvesting, e.g. for market).
ALTER TYPE "RowStatus" ADD VALUE 'STAFF_PICKING' AFTER 'OPEN';
