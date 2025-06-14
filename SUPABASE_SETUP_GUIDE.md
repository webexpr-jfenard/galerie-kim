# 📋 Guide de Configuration Supabase

Ce guide vous aidera à configurer Supabase pour votre application de galerie photo.

## 🚀 1. Créer un Compte Supabase

1. **Rendez-vous sur** [supabase.com](https://supabase.com)
2. **Cliquez sur** "Start your project"
3. **Créez un compte** avec GitHub, Google, ou email
4. **C'est gratuit** - 500MB de stockage et 50MB de base de données inclus

## 🏗️ 2. Créer un Nouveau Projet

1. **Tableau de bord** - Cliquez sur "New Project"
2. **Nom du projet** - Ex: "Photo Gallery App"
3. **Mot de passe** - Choisissez un mot de passe sécurisé pour votre base de données
4. **Région** - Sélectionnez la région la plus proche de vos utilisateurs
5. **Plan** - Gardez "Free" pour commencer
6. **Créer le projet** - Attendez quelques minutes pour l'initialisation

## 🔑 3. Récupérer les Credentials

### URL du Projet
1. **Allez dans** Settings → API
2. **Copiez** "Project URL"
3. **Format :** `https://your-project-id.supabase.co`

### Clé API Anonyme
1. **Dans la même page** Settings → API  
2. **Copiez** "anon public" key
3. **Format :** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **Important :** Utilisez la clé `anon` (pas `service_role`) pour la sécurité.

## 📦 4. Créer les Buckets de Stockage

### Bucket Principal (Photos)
1. **Storage** → Créer un bucket
2. **Nom :** `photos`
3. **Public :** Oui (pour affichage des images)
4. **Créer**

### Bucket Sélections (Optionnel)
1. **Storage** → Créer un bucket  
2. **Nom :** `selections`
3. **Public :** Oui (pour téléchargement des sélections)
4. **Créer**

## 🗄️ 5. Configurer la Base de Données

### Option A : Interface Supabase (Recommandé)
1. **SQL Editor** → New Query
2. **Copiez le contenu** du fichier `SUPABASE_TABLE_SETUP.sql`
3. **Exécutez** la requête
4. **Vérifiez** que la table `galleries` est créée

### Option B : Automatique via l'App
L'application tentera de créer la table automatiquement lors de la première utilisation.

## 🔐 6. Configurer les Politiques RLS (Optionnel)

Pour plus de sécurité, vous pouvez configurer des politiques d'accès :

```sql
-- Permettre la lecture des galeries publiques
CREATE POLICY "Allow read public galleries" ON galleries
  FOR SELECT USING (is_public = true);

-- Permettre toutes les opérations (plus simple pour débuter)
CREATE POLICY "Allow all operations" ON galleries
  FOR ALL USING (true);
```

## 📱 7. Tester la Configuration

1. **Dans l'application** → Admin Panel
2. **Supabase Configuration** → Entrez vos credentials
3. **Test Connection** → Vérifiez que ça fonctionne
4. **Save Configuration** → Sauvegardez

## ✅ 8. Vérification Finale

Votre configuration est réussie si vous voyez :
- ✅ **Connected & Ready** dans l'interface
- ✅ **Test Connection** réussit
- ✅ Vous pouvez créer des galeries
- ✅ Vous pouvez uploader des photos

## 🆘 Dépannage

### "Invalid API key"
- ✅ Vérifiez que vous utilisez la clé `anon public` (pas `service_role`)
- ✅ Vérifiez qu'il n'y a pas d'espaces en début/fin
- ✅ Régénérez la clé si nécessaire dans Settings → API

### "Connection failed"
- ✅ Vérifiez l'URL du projet (doit finir par `.supabase.co`)
- ✅ Vérifiez que le projet est actif (pas en pause)
- ✅ Testez votre connexion internet

### "Table doesn't exist"
- ✅ Exécutez le SQL dans `SUPABASE_TABLE_SETUP.sql`
- ✅ Vérifiez dans Database → Tables que `galleries` existe
- ✅ Vérifiez les permissions RLS

### Upload ne fonctionne pas
- ✅ Vérifiez que le bucket `photos` existe
- ✅ Vérifiez que le bucket est **public**
- ✅ Testez l'upload dans l'interface Supabase

## 💡 Conseils

### Organisation
- **Un projet Supabase** = Une application complète
- **Buckets séparés** pour différents types de fichiers
- **Dossiers** dans les buckets pour organiser par client

### Sécurité
- **N'exposez jamais** la clé `service_role`
- **Utilisez toujours** la clé `anon public`
- **Configurez RLS** pour la production

### Performance  
- **Choisissez la région** la plus proche de vos utilisateurs
- **Optimisez vos images** avant upload
- **Utilisez le cache** pour les images fréquemment consultées

## 📞 Support

- **Documentation Supabase :** [docs.supabase.com](https://docs.supabase.com)
- **Communauté :** [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Discord :** [discord.supabase.com](https://discord.supabase.com)

---

🎉 **Félicitations !** Votre application de galerie photo est maintenant connectée au cloud avec Supabase !