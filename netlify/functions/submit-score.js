const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { name, score } = JSON.parse(event.body);

        // Validate input
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid name' })
            };
        }

        if (!score || typeof score !== 'number' || score < 0 || score > 999999) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid score' })
            };
        }

        const sanitizedName = name.trim().toUpperCase().substring(0, 15);
        const validScore = Math.floor(score);

        // Create Supabase client with service key (server-side only)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check if player exists
        const { data: existing } = await supabase
            .from('leaderboard')
            .select('id, score')
            .eq('name', sanitizedName);

        const existingPlayer = existing && existing.length > 0 ? existing[0] : null;

        if (existingPlayer) {
            // Only update if new score is higher
            if (validScore > existingPlayer.score) {
                const { error } = await supabase
                    .from('leaderboard')
                    .update({ score: validScore })
                    .eq('id', existingPlayer.id);

                if (error) throw error;
            }
        } else {
            // Insert new entry
            const { error } = await supabase
                .from('leaderboard')
                .insert([{ name: sanitizedName, score: validScore }]);

            if (error) throw error;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' })
        };
    }
};
