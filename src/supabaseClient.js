import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://piiukbcyvbrlkjvptspv.supabase.co';
const SUPABASE_KEY =
 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpaXVrYmN5dmJybGtqdnB0c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Mjg2NzksImV4cCI6MjA3MTIwNDY3OX0.J376VTOIhP6JBEUtvepzF8g-QXnzZGmyeum0jffkpSs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper function to fetch historical data with time range
export async function fetchHistoricalData(start, end) {
  const { data, error } = await supabase
    .from("LoRaData")
    .select("id, data, inserted_at")
    .gte("inserted_at", start.toISOString())
    .lte("inserted_at", end.toISOString())
    .order("inserted_at", { ascending: false });

  if (error) throw error;
  return data;
}


// Helper function to get aggregated data by time period
export const fetchAggregatedData = async (startDate, endDate, period = 'day') => {
  try {
    const { data, error } = await supabase
      .rpc('get_aggregated_data', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        time_period: period
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching aggregated data:', error);
    throw error;
  }
};

// Helper function to get node-specific historical data
export const fetchNodeHistoricalData = async (node, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('LoRaData')
      .select('*')
      .contains('data', { node })
      .gte('inserted_at', startDate.toISOString())
      .lte('inserted_at', endDate.toISOString())
      .order('inserted_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching node historical data:', error);
    throw error;
  }
};

export { supabase };
