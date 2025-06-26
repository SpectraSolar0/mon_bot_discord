// ========================
// 🔧 IMPORTS & CONFIG
// ========================
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  Partials, 
  ChannelType 
} = require('discord.js');

const fs = require('fs');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Le bot est vivant !'));
app.listen(process.env.PORT || 3000, () => {
  console.log(`Serveur web actif sur le port ${process.env.PORT || 3000}`);
});

const keepAliveIntervals = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag} !`);

  client.user.setActivity('One Piece', { type: 'PLAYING' });

  client.user.setPresence({
    activities: [{ name: '/help', type: 3 }], // 3 = WATCHING
    status: 'online' 
  });
});

// ========================
// 🔐 UTILITAIRES
// ========================

const OWNER_ID = '991295146215882872';

function isOwner(message) {
  return message.author.id === OWNER_ID;
}

function isMod(member) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.KickMembers) ||
         member.permissions.has(PermissionFlagsBits.BanMembers) ||
         member.permissions.has(PermissionFlagsBits.ManageMessages);
}

const warns = {};
const activeConversations = new Map();

// Fonction utilitaire pour envoyer un embed réponse simple
function sendEmbed(channel, title, description, color = 0x00AE86) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color);
  return channel.send({ embeds: [embed] });
}

// ========================
// 📚 COMMANDES PUBLIQUES
// ========================

const publicCommands = {
  '!bonjour': msg => msg.channel.send('Bonjour à toi 👋 !'),
  '!diego': msg => msg.channel.send('⚡ Diego, le moteur inarrêtable. Fort, loyal et toujours volontaire, il est celui qui fonce quand les autres hésitent, qui soutient sans jamais faillir. Son rire et sa force sont contagieux, sa présence un véritable pilier.'),
  '!leo': msg => msg.channel.send('🏀 Léo est un passionné de sport, toujours prêt à relever de nouveaux défis. Son énergie et son enthousiasme sont communicatifs.'),
  '!maryne': msg => msg.channel.send('🌸 Maryne, douce et attentionnée, elle apporte toujours un vent de calme et de sérénité autour d’elle.'),
  '!aldo': msg => msg.channel.send('🛠 Aldo, le bricoleur du groupe, toujours prêt à réparer ou inventer quelque chose.'),
  '!joachim': msg => msg.channel.send('📚 Joachim, l’intellectuel passionné, avide de connaissances et toujours curieux.'),
  '!adam': msg => msg.channel.send('🔥 Adam, plein d’énergie et toujours partant pour l’aventure.'),
  '!martin': msg => msg.channel.send('🎨 Martin, créatif et inspirant, il voit le monde avec un regard artistique.'),
  '!antoine': msg => msg.channel.send('⚡ Antoine, rapide et efficace, toujours au taquet.'),
  '!esteban': msg => msg.channel.send('🌟 Esteban, un vrai leader naturel, qui sait motiver les autres.'),
  '!troll': msg => msg.channel.send('😈 Attention, le troll est parmi nous...'),
  '!dice': msg => {
    const roll = Math.floor(Math.random() * 6) + 1;
    msg.channel.send(`🎲 Tu as lancé un dé et obtenu : ${roll}`);
  },
  '!ping': msg => msg.channel.send('Pong ! 🏓'),
  '!pileface': msg => {
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';
    msg.channel.send(`🪙 Résultat : ${result}`);
  },
  '!joke': msg => {
    const jokes = [
      "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau.",
      "Pourquoi les maths détestent-elles la forêt ? Parce qu'il y a trop de racines.",
      "Qu'est-ce qui est jaune et qui attend ? Jonathan."
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    msg.channel.send(`😂 ${joke}`);
  },
  '!8ball': msg => {
    const answers = [
      "Oui", "Non", "Peut-être", "Je ne sais pas", "Demande plus tard", "Certainement", "Impossible"
    ];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    msg.channel.send(`🎱 ${answer}`);
  },
};

// ========================
// 🎯 GESTION DES MESSAGES (COMMANDES + RELAIS)
// ========================

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Gestion des conversations admin <-> utilisateur en MP
  if (message.guild) {
    if (activeConversations.has(message.author.id)) {
      const userId = activeConversations.get(message.author.id);
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) user.send({ embeds: [new EmbedBuilder()
        .setTitle('💬 Message de l\'admin')
        .setDescription(message.content)
        .setColor(0x00AE86)] }).catch(() => {});
    }
  } else {
    for (const [adminId, userId] of activeConversations.entries()) {
      if (userId === message.author.id) {
        const admin = await client.users.fetch(adminId).catch(() => null);
        if (admin) admin.send({ embeds: [new EmbedBuilder()
          .setTitle('💬 Message de l\'utilisateur')
          .setDescription(message.content)
          .setColor(0x00AE86)] }).catch(() => {});
        break;
      }
    }
  }

  if (!message.content.startsWith('!')) return;

  const cmd = message.content.split(' ')[0].toLowerCase();
  const args = message.content.slice(cmd.length).trim().split(/\s+/);

  // Commande !help publique
  if (cmd === '!help') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🤖 Commandes du Bot')
      .setDescription('Voici la liste des commandes disponibles :')
      .addFields(
        { name: 'Commandes simples', value: '`!bonjour`, `!diego`, `!leo`, `!maryne`, `!aldo`, `!joachim`, `!adam`, `!martin`, `!antoine`, `!esteban`, `!troll`, `!dice`' },
        { name: 'Autres commandes', value: '`!ping`, `!pileface`, `!joke`, `!8ball`' },
        { name: 'Modération (réservé aux modérateurs)', value: '`!warn`, `!warns`, `!clearwarns`, `!kick`, `!ban`, `!unban`, `!clear`, `!botinfo`, `!contact`, `!endcontact`' },
        { name: 'Propriétaire', value: '`!saveserver`, `!boom`, `!undoboom`, `!say`' }
      )
      .setColor(0x00AE86);
    await message.channel.send({ embeds: [helpEmbed] });
    return;
  }

  // Commandes publiques (hors modération)
  if (publicCommands[cmd]) {
    await publicCommands[cmd](message);
    return;
  }

  // Commandes modération & admin
  if (!message.guild) return; // modération en serveur uniquement
  if (!isMod(message.member)) return; // vérification modérateur

  // Gestion des commandes modération
  if (cmd === '!warn') {
    if (args.length < 2) return sendEmbed(message.channel, 'Erreur', 'Usage : !warn @user raison', 0xFF0000);

    const user = message.mentions.users.first();
    if (!user) return sendEmbed(message.channel, 'Erreur', 'Mentionne un utilisateur valide.', 0xFF0000);

    const reason = args.slice(1).join(' ');
    if (!warns[user.id]) warns[user.id] = [];
    warns[user.id].push({ reason, moderator: message.author.tag, date: new Date().toISOString() });
    sendEmbed(message.channel, 'Warn', `L'utilisateur ${user.tag} a été averti pour : ${reason}`);
    return;
  }

  if (cmd === '!warns') {
    const user = message.mentions.users.first();
    if (!user) return sendEmbed(message.channel, 'Erreur', 'Mentionne un utilisateur valide.', 0xFF0000);
    if (!warns[user.id] || warns[user.id].length === 0) {
      return sendEmbed(message.channel, 'Warns', `${user.tag} n'a aucun avertissement.`);
    }
    const embed = new EmbedBuilder()
      .setTitle(`Warns de ${user.tag}`)
      .setColor(0xFFA500);
    warns[user.id].forEach((w, i) => {
      embed.addFields({ name: `#${i + 1}`, value: `Raison: ${w.reason}\nModérateur: ${w.moderator}\nDate: ${new Date(w.date).toLocaleString()}` });
    });
    message.channel.send({ embeds: [embed] });
    return;
  }

  if (cmd === '!clearwarns') {
    const user = message.mentions.users.first();
    if (!user) return sendEmbed(message.channel, 'Erreur', 'Mentionne un utilisateur valide.', 0xFF0000);
    warns[user.id] = [];
    sendEmbed(message.channel, 'Warns', `Tous les avertissements de ${user.tag} ont été effacés.`);
    return;
  }

  if (cmd === '!kick') {
    const member = message.mentions.members.first();
    if (!member) return sendEmbed(message.channel, 'Erreur', 'Mentionne un membre valide.', 0xFF0000);
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    if (!member.kickable) return sendEmbed(message.channel, 'Erreur', 'Je ne peux pas expulser cet utilisateur.', 0xFF0000);
    await member.kick(reason);
    sendEmbed(message.channel, 'Kick', `${member.user.tag} a été expulsé. Raison : ${reason}`);
    return;
  }

  if (cmd === '!ban') {
    const member = message.mentions.members.first();
    if (!member) return sendEmbed(message.channel, 'Erreur', 'Mentionne un membre valide.', 0xFF0000);
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    if (!member.bannable) return sendEmbed(message.channel, 'Erreur', 'Je ne peux pas bannir cet utilisateur.', 0xFF0000);
    await member.ban({ reason });
    sendEmbed(message.channel, 'Ban', `${member.user.tag} a été banni. Raison : ${reason}`);
    return;
  }

  if (cmd === '!unban') {
    const userId = args[0];
    if (!userId) return sendEmbed(message.channel, 'Erreur', 'Fournis un ID utilisateur.', 0xFF0000);
    try {
      await message.guild.members.unban(userId);
      sendEmbed(message.channel, 'Unban', `L'utilisateur ${userId} a été débanni.`);
    } catch {
      sendEmbed(message.channel, 'Erreur', 'Impossible de débannir cet utilisateur.', 0xFF0000);
    }
    return;
  }

  if (cmd === '!clear') {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) return sendEmbed(message.channel, 'Erreur', 'Usage : !clear <nombre entre 1 et 100>', 0xFF0000);
    await message.channel.bulkDelete(amount, true);
    sendEmbed(message.channel, 'Clear', `${amount} messages supprimés.`);
    return;
  }

  if (cmd === '!botinfo') {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Infos du Bot')
      .addFields(
        { name: 'Nom', value: client.user.username, inline: true },
        { name: 'ID', value: client.user.id, inline: true },
        { name: 'Serveurs', value: client.guilds.cache.size.toString(), inline: true },
        { name: 'Utilisateurs', value: client.users.cache.size.toString(), inline: true },
      )
      .setColor(0x00AE86);
    message.channel.send({ embeds: [embed] });
    return;
  }

  if (cmd === '!contact') {
    if (activeConversations.has(message.author.id)) return sendEmbed(message.channel, 'Contact', 'Tu es déjà en conversation.', 0xFF0000);
    const user = message.mentions.users.first();
    if (!user) return sendEmbed(message.channel, 'Erreur', 'Mentionne un utilisateur à contacter.', 0xFF0000);
    activeConversations.set(message.author.id, user.id);
    sendEmbed(message.channel, 'Contact', `Conversation ouverte entre ${message.author.tag} et ${user.tag}.`);
    return;
  }

  if (cmd === '!endcontact') {
    if (!activeConversations.has(message.author.id)) return sendEmbed(message.channel, 'Contact', 'Tu n\'as pas de conversation active.', 0xFF0000);
    activeConversations.delete(message.author.id);
    sendEmbed(message.channel, 'Contact', 'Conversation terminée.');
    return;
  }

  // Commandes propriétaire
  if (!isOwner(message)) return;

  if (cmd === '!boom') {
    // Exemple simplifié de création de 100 salons
    const guild = message.guild;
    if (!guild) return sendEmbed(message.channel, 'Erreur', 'Commande utilisable seulement en serveur.', 0xFF0000);

    for (let i = 1; i <= 100; i++) {
      guild.channels.create({ name: `salon-${i}`, type: ChannelType.GuildText }).catch(() => {});
    }
    sendEmbed(message.channel, 'Boom', '100 salons créés.');
    return;
  }

  if (cmd === '!saveserver') {
    const guild = message.guild;
    if (!guild) return sendEmbed(message.channel, 'Erreur', 'Commande utilisable seulement en serveur.', 0xFF0000);

    const data = {
      channels: guild.channels.cache.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId || null,
        position: c.position
      }))
    };

    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync('./server_backup.json', json);
    sendEmbed(message.channel, 'Sauvegarde', 'Structure du serveur sauvegardée dans server_backup.json');
    return;
  }

  if (cmd === '!undoboom') {
    const guild = message.guild;
    if (!guild) return sendEmbed(message.channel, 'Erreur', 'Commande utilisable seulement en serveur.', 0xFF0000);

    if (!fs.existsSync('./server_backup.json')) {
      return sendEmbed(message.channel, 'Erreur', 'Aucune sauvegarde trouvée.', 0xFF0000);
    }

    const json = fs.readFileSync('./server_backup.json', 'utf-8');
    const data = JSON.parse(json);

    // Suppression des salons existants (simplifié, attention en production)
    guild.channels.cache.forEach(ch => ch.delete().catch(() => {}));

    // Recréation des salons d'après la sauvegarde
    for (const ch of data.channels) {
      guild.channels.create({ 
        name: ch.name,
        type: ch.type
      }).catch(() => {});
    }

    sendEmbed(message.channel, 'Restauration', 'Structure du serveur restaurée.');
    return;
  }

  if (cmd === '!say') {
    const text = args.join(' ');
    if (!text) return sendEmbed(message.channel, 'Erreur', 'Usage : !say <texte>', 0xFF0000);
    message.channel.send(text);
    return;
  }

  if (cmd === '!keepalive') {
    // On vérifie si un intervalle est déjà actif sur ce salon
    if (keepAliveIntervals.has(message.channel.id)) {
      return message.channel.send('⚠️ Un keepalive est déjà actif dans ce salon.');
    }

    message.channel.send('✅ Keepalive activé : je vais envoyer un message toutes les 30 secondes ici.');

    // Lance un intervalle pour envoyer un message toutes les 30 secondes
    const interval = setInterval(() => {
      message.channel.send('🟢 Je suis toujours là !');
    }, 30 * 1000);

    keepAliveIntervals.set(message.channel.id, interval);
    return;
  }

  // Ajoute aussi une commande pour stopper le keepalive dans un salon

  if (cmd === '!stopkeepalive') {
    if (!keepAliveIntervals.has(message.channel.id)) {
      return message.channel.send('⚠️ Aucun keepalive actif dans ce salon.');
    }

    clearInterval(keepAliveIntervals.get(message.channel.id));
    keepAliveIntervals.delete(message.channel.id);

    message.channel.send('⛔ Keepalive arrêté dans ce salon.');
    return;
  }
});

client.login(process.env.TOKEN);