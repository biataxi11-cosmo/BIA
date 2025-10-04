'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Phone, Mail, Calendar, Users, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface ExtendedUserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'customer' | 'driver' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  fullName?: string;
  phoneNumber?: string;
  birthday?: string;
  gender?: string;
  emergencyContacts?: EmergencyContact[];
}

function CustomerProfile() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({ name: '', phone: '', relationship: '' });
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile({
              ...userData,
              createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt),
              updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(userData.updatedAt),
            } as ExtendedUserProfile);
            
            if (userData.emergencyContacts) {
              setEmergencyContacts(userData.emergencyContacts);
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load profile data.',
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleAddEmergencyContact = () => {
    if (emergencyContact.name && emergencyContact.phone && emergencyContact.relationship) {
      setEmergencyContacts(prev => [...prev, emergencyContact]);
      setEmergencyContact({ name: '', phone: '', relationship: '' });
    }
  };

  const handleRemoveEmergencyContact = (index: number) => {
    setEmergencyContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmergencyContact(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      const profileData = {
        ...profile,
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        birthday: profile.birthday || '',
        gender: profile.gender || '',
        emergencyContacts,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'users', user.uid), profileData);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center">
                  <UserCircle className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Customer Profile</CardTitle>
                  <CardDescription>Manage your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="fullName"
                          name="fullName"
                          value={profile?.fullName || ''}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Mobile Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          value={profile?.phoneNumber || ''}
                          onChange={handleInputChange}
                          placeholder="Enter your phone number"
                          type="tel"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          value={profile?.email || ''}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          type="email"
                          disabled
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Birthday</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="birthday"
                          name="birthday"
                          value={profile?.birthday || ''}
                          onChange={handleInputChange}
                          type="date"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select 
                        value={profile?.gender || ''} 
                        onValueChange={(value) => handleSelectChange('gender', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Emergency Contacts
                  </CardTitle>
                  <CardDescription>Add and manage emergency contacts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emergencyContacts.length > 0 && (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {emergencyContacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.phone}</p>
                            <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveEmergencyContact(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-3 pt-2 border-t">
                    <h4 className="font-medium">Add New Contact</h4>
                    <div className="space-y-2">
                      <Input
                        name="name"
                        value={emergencyContact.name}
                        onChange={handleEmergencyContactChange}
                        placeholder="Full name"
                      />
                      <Input
                        name="phone"
                        value={emergencyContact.phone}
                        onChange={handleEmergencyContactChange}
                        placeholder="Phone number"
                        type="tel"
                      />
                      <Input
                        name="relationship"
                        value={emergencyContact.relationship}
                        onChange={handleEmergencyContactChange}
                        placeholder="Relationship"
                      />
                      <Button 
                        className="w-full"
                        onClick={handleAddEmergencyContact}
                        disabled={!emergencyContact.name || !emergencyContact.phone || !emergencyContact.relationship}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(CustomerProfile, ['customer']);