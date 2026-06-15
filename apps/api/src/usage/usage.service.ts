import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsageService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSummary(userId: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('usage_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const events = data ?? [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const byModel: Record<string, { promptTokens: number; completionTokens: number }> = {};
    const byDayMap: Record<string, number> = {};

    for (const event of events) {
      totalPromptTokens += event.prompt_tokens ?? 0;
      totalCompletionTokens += event.completion_tokens ?? 0;

      if (!byModel[event.model]) {
        byModel[event.model] = { promptTokens: 0, completionTokens: 0 };
      }
      byModel[event.model]!.promptTokens += event.prompt_tokens ?? 0;
      byModel[event.model]!.completionTokens += event.completion_tokens ?? 0;

      const day = (event.created_at as string).slice(0, 10);
      byDayMap[day] = (byDayMap[day] ?? 0) + (event.prompt_tokens ?? 0) + (event.completion_tokens ?? 0);
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, tokens]) => ({ date, tokens }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      byModel,
      byDay,
    };
  }
}
