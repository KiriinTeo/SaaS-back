'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState } from 'react';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Users, Crown, ShieldAlert } from 'lucide-react';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubscriptionSkeleton() {
  return (
    <Card className="mb-6 h-[140px] bg-[#10171D]/80 border-emerald-900/30 animate-pulse">
      <CardHeader>
        <CardTitle className="text-slate-300">Team Subscription</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-6 bg-[#10171D]/80 border border-emerald-900/30 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          Assinatura da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="font-semibold text-slate-200">
              Plano Atual:{' '}
              <span className="text-emerald-400 uppercase tracking-wide">
                {teamData?.planName || 'Free'}
              </span>
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {teamData?.subscriptionStatus === 'active'
                ? 'Faturado mensalmente • Acesso total ao stream'
                : teamData?.subscriptionStatus === 'trialing'
                ? 'Período de testes ativo'
                : 'Nenhuma assinatura ativa vinculada'}
            </p>
          </div>
          <form action={customerPortalAction}>
            <Button
              type="submit"
              variant="outline"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            >
              Gerenciar Assinatura Stripe
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembersSkeleton() {
  return (
    <Card className="mb-6 h-[140px] bg-[#10171D]/80 border-emerald-900/30 animate-pulse">
      <CardHeader>
        <CardTitle className="text-slate-300">Membros da Equipe</CardTitle>
      </CardHeader>
    </Card>
  );
}

function TeamMembers() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || 'Membro';
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-6 bg-[#10171D]/80 border border-emerald-900/30 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-emerald-400" />
            Membros da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">Nenhum membro na equipe ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-[#10171D]/80 border border-emerald-900/30 backdrop-blur-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-emerald-400" />
          Membros da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member, index) => (
            <li
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80"
            >
              <div className="flex items-center space-x-4">
                <Avatar className="ring-2 ring-emerald-500/30">
                  <AvatarFallback className="bg-emerald-950 text-emerald-300 font-bold">
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-100 text-sm">
                    {getUserDisplayName(member.user)}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    {member.role === 'owner' ? 'Proprietário' : 'Membro'}
                  </p>
                </div>
              </div>
              {index > 1 ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                    disabled={isRemovePending}
                  >
                    {isRemovePending ? 'Removendo...' : 'Remover'}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {removeState?.error && (
          <p className="text-red-400 text-sm mt-4">{removeState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InviteTeamMemberSkeleton() {
  return (
    <Card className="h-[240px] bg-[#10171D]/80 border-emerald-900/30 animate-pulse">
      <CardHeader>
        <CardTitle className="text-slate-300">Convidar Membro</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const isOwner = user?.role === 'owner';
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  return (
    <Card className="bg-[#10171D]/80 border border-emerald-900/30 backdrop-blur-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          Convidar Novo Membro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2 text-slate-300 text-sm">
              E-mail do convidado
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="exemplo@empresa.com"
              required
              disabled={!isOwner}
              className="bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-sm mb-2 block">Papel na equipe</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex space-x-6"
              disabled={!isOwner}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member" className="text-slate-300 cursor-pointer">
                  Membro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner" className="text-slate-300 cursor-pointer">
                  Proprietário
                </Label>
              </div>
            </RadioGroup>
          </div>
          {inviteState?.error && (
            <p className="text-red-400 text-sm">{inviteState.error}</p>
          )}
          {inviteState?.success && (
            <p className="text-emerald-400 text-sm">{inviteState.success}</p>
          )}
          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
            disabled={isInvitePending || !isOwner}
          >
            {isInvitePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Convidando...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Enviar Convite
              </>
            )}
          </Button>
        </form>
      </CardContent>
      {!isOwner && (
        <CardFooter className="border-t border-slate-800/60 pt-4">
          <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            Você precisa ser proprietário da equipe para enviar convites.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function TeamPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Gerenciamento de Equipe</h1>
        <p className="text-slate-400 text-sm">
          Gerencie assinaturas, acessos e membros vinculados à sua conta.
        </p>
      </div>

      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
      <Suspense fallback={<TeamMembersSkeleton />}>
        <TeamMembers />
      </Suspense>
      <Suspense fallback={<InviteTeamMemberSkeleton />}>
        <InviteTeamMember />
      </Suspense>
    </div>
  );
}
