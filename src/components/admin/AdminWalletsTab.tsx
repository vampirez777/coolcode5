import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wallet, Plus, Pencil, Trash2, Save, X } from "lucide-react";

const COINS = [
  { name: "Bitcoin", network: "Bitcoin", icon: "₿" },
  { name: "Ethereum", network: "Ethereum", icon: "Ξ" },
  { name: "Litecoin", network: "Litecoin", icon: "Ł" },
  { name: "Solana", network: "Solana", icon: "◎" },
  { name: "USDC", network: "Solana", icon: "$" },
  { name: "USDT", network: "Solana", icon: "₮" },
  { name: "USDC", network: "Ethereum", icon: "$" },
  { name: "USDT", network: "Ethereum", icon: "₮" },
  { name: "USDT", network: "BSC", icon: "₮" },
];

const AdminWalletsTab = () => {
  const [wallets, setWallets] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [addingCoin, setAddingCoin] = useState<typeof COINS[0] | null>(null);
  const [newAddress, setNewAddress] = useState("");

  const loadWallets = async () => {
    const { data } = await supabase
      .from("escrow_wallets")
      .select("*")
      .order("coin");
    setWallets(data || []);
  };

  useEffect(() => { loadWallets(); }, []);

  const existingKeys = new Set(wallets.map(w => `${w.coin}-${w.network}`));
  const availableCoins = COINS.filter(c => !existingKeys.has(`${c.name}-${c.network}`));

  const handleAdd = async () => {
    if (!addingCoin || !newAddress.trim()) {
      toast({ title: "Enter a wallet address", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("escrow_wallets").insert({
      coin: addingCoin.name,
      network: addingCoin.network,
      wallet_address: newAddress.trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${addingCoin.name} (${addingCoin.network}) wallet saved` });
      setAddingCoin(null);
      setNewAddress("");
      loadWallets();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editAddress.trim()) return;
    const { error } = await supabase.from("escrow_wallets").update({ wallet_address: editAddress.trim() }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Wallet updated" });
      setEditingId(null);
      loadWallets();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("escrow_wallets").delete().eq("id", id);
    toast({ title: "Wallet removed" });
    loadWallets();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("escrow_wallets").update({ is_active: !currentActive }).eq("id", id);
    toast({ title: currentActive ? "Wallet disabled" : "Wallet enabled" });
    loadWallets();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Escrow Wallet Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {wallets.length === 0 && !addingCoin && (
            <p className="text-sm text-muted-foreground text-center py-4">No wallets configured yet. Add addresses for each supported coin.</p>
          )}

          {wallets.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10">
              <div className="min-w-[120px]">
                <p className="text-sm font-medium text-foreground">{w.coin}</p>
                <p className="text-xs text-muted-foreground">{w.network}</p>
              </div>

              {editingId === w.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="font-mono text-xs flex-1"
                    placeholder="Wallet address"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleUpdate(w.id)}>
                    <Save className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="flex-1 font-mono text-xs text-foreground break-all">{w.wallet_address}</p>
                  <Badge variant={w.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleActive(w.id, w.is_active)}>
                    {w.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(w.id); setEditAddress(w.wallet_address); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Add new wallet */}
          {addingCoin ? (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{addingCoin.icon} {addingCoin.name} ({addingCoin.network})</p>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAddingCoin(null)}><X className="h-4 w-4" /></Button>
              </div>
              <Input
                placeholder="Paste wallet address..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="font-mono text-xs"
              />
              <Button onClick={handleAdd} className="w-full gap-2" size="sm">
                <Save className="h-4 w-4" /> Save Wallet
              </Button>
            </div>
          ) : availableCoins.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Add wallet for:</p>
              <div className="flex flex-wrap gap-2">
                {availableCoins.map((c, i) => (
                  <Button key={i} variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingCoin(c)}>
                    <Plus className="h-3 w-3" /> {c.name} ({c.network})
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">All supported coins have wallet addresses configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletsTab;
