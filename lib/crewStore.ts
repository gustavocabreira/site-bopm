import "server-only";
import { createSupabaseAdminClient } from "./supabase";

export interface Crew {
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
}

/** Retorna a ultima guarnicao usada pelo usuario, ou null se nunca houve uma sessao anterior. */
export async function getLastCrew(discordUserId: string): Promise<Crew | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("crews")
    .select("prefixo, chefe_equipe, motorista, homem3, homem4")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    prefixo: data.prefixo,
    chefeEquipe: data.chefe_equipe,
    motorista: data.motorista,
    homem3: data.homem3 ?? "",
    homem4: data.homem4 ?? "",
  };
}

/** Salva a guarnicao usada nesta sessao para reaproveitar na proxima. */
export async function saveCrew(discordUserId: string, crew: Crew): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("crews").upsert(
    {
      discord_user_id: discordUserId,
      prefixo: crew.prefixo,
      chefe_equipe: crew.chefeEquipe,
      motorista: crew.motorista,
      homem3: crew.homem3 || null,
      homem4: crew.homem4 || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "discord_user_id" },
  );
}
