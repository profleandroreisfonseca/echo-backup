import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Upload, Clock, CheckCircle2 } from "lucide-react";
import { Contacts } from "@capacitor-community/contacts";

interface Contact {
  name: string;
  phone: string;
  email?: string;
}

const Index = () => {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lastBackup");
    if (stored) {
      setLastBackup(stored);
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const permission = await Contacts.requestPermissions();
      return permission.contacts === "granted";
    } catch (error) {
      console.error("Erro ao solicitar permissões:", error);
      toast.error("Erro ao solicitar permissões de contatos");
      return false;
    }
  };

  const getContacts = async (): Promise<Contact[]> => {
    try {
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        },
      });

      return result.contacts.map((contact) => ({
        name: contact.name?.display || "Sem nome",
        phone: contact.phones?.[0]?.number || "",
        email: contact.emails?.[0]?.address || "",
      }));
    } catch (error) {
      console.error("Erro ao ler contatos:", error);
      throw new Error("Não foi possível ler os contatos");
    }
  };

  const sendBackup = async (contacts: Contact[]) => {
    try {
      const response = await fetch(
        "https://n8n.wamanager.com.br/webhook/eba61d8f-5f8d-4d0c-a6ff-58f9b99e706a",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contacts,
            timestamp: new Date().toISOString(),
            total: contacts.length,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Falha no envio do backup");
      }

      return true;
    } catch (error) {
      console.error("Erro ao enviar backup:", error);
      throw new Error("Não foi possível enviar o backup");
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);

    try {
      // Verificar permissões
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        toast.error("Permissão negada para acessar contatos");
        setIsLoading(false);
        return;
      }

      // Ler contatos
      toast.loading("Lendo contatos...");
      const contacts = await getContacts();

      if (contacts.length === 0) {
        toast.info("Nenhum contato encontrado");
        setIsLoading(false);
        return;
      }

      // Enviar backup
      toast.loading(`Enviando ${contacts.length} contatos...`);
      await sendBackup(contacts);

      // Salvar data do último backup
      const now = new Date().toLocaleString("pt-BR");
      setLastBackup(now);
      localStorage.setItem("lastBackup", now);

      toast.success("Backup enviado com sucesso!", {
        description: `${contacts.length} contatos foram salvos`,
        icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      });
    } catch (error) {
      toast.error("Erro ao fazer backup", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">BKP Contatos</h1>
          <p className="text-muted-foreground">
            Faça backup seguro dos seus contatos de forma simples e rápida
          </p>
        </div>

        {/* Main Card */}
        <Card className="p-8 space-y-6 shadow-card">
          <div className="space-y-4">
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Sobre o aplicativo
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este aplicativo faz backup seguro dos seus contatos enviando as
                informações de forma criptografada para um servidor seguro.
              </p>
            </div>

            {lastBackup && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-success/5 p-3 rounded-lg border border-success/20">
                <Clock className="h-4 w-4 text-success" />
                <span>Último backup: {lastBackup}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleBackup}
            disabled={isLoading}
            size="lg"
            className="w-full h-14 text-lg font-semibold shadow-button hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Enviar Backup
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao clicar, você permite o acesso aos seus contatos para realizar o backup
          </p>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>🔒 Seus dados são transmitidos com segurança</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
