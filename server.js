// Rota para recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email é obrigatório' });
        }

        // Busca o usuário pelo email
        const user = await User.findOne({ email });
        
        // Por segurança, sempre retornamos a mesma mensagem, mesmo se o email não existir
        if (!user) {
            return res.status(200).json({ 
                message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.' 
            });
        }

        // Gera token de reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora

        // Salva o token no usuário
        await user.save();

        // Cria URL de reset
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

        // Configura o email
        const mailOptions = {
            from: `"SuperPro" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Recuperação de Senha - SuperPro',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">Recuperação de Senha</h2>
                    <p>Olá,</p>
                    <p>Você solicitou a recuperação de senha da sua conta no SuperPro.</p>
                    <p>Clique no botão abaixo para redefinir sua senha:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #4CAF50; 
                                  color: white; 
                                  padding: 12px 24px; 
                                  text-decoration: none; 
                                  border-radius: 4px; 
                                  display: inline-block;">
                            Redefinir Senha
                        </a>
                    </div>
                    <p>Se você não solicitou esta recuperação de senha, por favor ignore este email.</p>
                    <p>Este link expira em 1 hora.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Este é um email automático, por favor não responda.
                    </p>
                </div>
            `
        };

        // Envia o email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.' 
        });
    } catch (error) {
        console.error('Erro na recuperação de senha:', error);
        res.status(500).json({ message: 'Erro ao processar a recuperação de senha' });
    }
});

// Rota para buscar jogos do dia
app.get('/api/sports', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Data inicial e final são obrigatórias' });
    }

    // Busca os jogos do dia na API de esportes
    const response = await fetch(`https://betminer.p.rapidapi.com/fixtures?date=${dateFrom}`, {
      headers: {
        'x-rapidapi-host': process.env.SPORTS_API_HOST,
        'x-rapidapi-key': process.env.SPORTS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar dados da API de esportes');
    }

    const data = await response.json();
    
    // Processa os dados para retornar apenas as informações necessárias
    const matches = data.response.map(match => ({
      league_name: match.league.name,
      league_logo: match.league.logo,
      home_team: match.teams.home.name,
      away_team: match.teams.away.name,
      match_time: match.fixture.date,
      home_win_odds: match.odds?.home_win || 'N/A',
      draw_odds: match.odds?.draw || 'N/A',
      away_win_odds: match.odds?.away_win || 'N/A',
      homeID: match.teams.home.id,
      awayID: match.teams.away.id,
      homeLogo: match.teams.home.logo,
      awayLogo: match.teams.away.logo,
      competition_full: match.league.name,
      status: match.fixture.status.short,
      home_goals: match.goals?.home || 0,
      away_goals: match.goals?.away || 0,
      "1x2": match.prediction || "1" // Valor padrão, pode ser ajustado conforme necessário
    }));

    res.json(matches);
  } catch (error) {
    console.error('Erro ao buscar jogos:', error);
    res.status(500).json({ error: 'Erro ao buscar jogos do dia' });
  }
});

// Função auxiliar para calcular probabilidade
function calculateProbability(homeGoals, awayGoals) {
    // Lógica simplificada de cálculo de probabilidade
    const totalGoals = homeGoals + awayGoals;
    if (totalGoals === 0) return 50;
    
    const homeProbability = (homeGoals / totalGoals) * 100;
    return Math.round(homeProbability);
} 