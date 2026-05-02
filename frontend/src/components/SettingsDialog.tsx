import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Moon, Sun, Monitor, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAvatar(user.avatar || null);
    }
  }, [open, user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be smaller than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({ name, avatar });
      toast.success("Profile updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-secondary text-secondary-foreground mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="personalisation">Personalisation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <label className="relative group cursor-pointer block">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-3xl font-semibold text-primary neon-border overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                />
              </label>
              <p className="text-xs text-muted-foreground text-center">Click avatar to change picture (Max 2MB)</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="bg-background" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user?.email || ""} readOnly className="bg-background opacity-70" />
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </TabsContent>
          
          <TabsContent value="personalisation" className="space-y-4">
            <div className="space-y-4 py-4">
              <Label>Theme Preference</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className={`flex flex-col items-center gap-2 h-auto py-4 ${theme === "light" ? "border-primary text-primary bg-primary/10" : "text-muted-foreground"}`}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button 
                  variant="outline" 
                  className={`flex flex-col items-center gap-2 h-auto py-4 ${theme === "dark" ? "border-primary text-primary bg-primary/10" : "text-muted-foreground"}`}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button 
                  variant="outline" 
                  className={`flex flex-col items-center gap-2 h-auto py-4 ${theme === "system" ? "border-primary text-primary bg-primary/10" : "text-muted-foreground"}`}
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
