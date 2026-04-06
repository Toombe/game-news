const fs = require('fs');

const FEEDS = [
    { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
    { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed' },
    { name: 'Eurogamer', url: 'https://www.eurogamer.net/feed/news' },
    { name: 'The Verge (Games)', url: 'https://www.theverge.com/rss/games/index.xml' },
    { name: 'The Verge (Tech)', url: 'https://www.theverge.com/rss/tech/index.xml' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/gaming' },
    { name: 'Nintendo Life', url: 'https://www.nintendolife.com/feeds/news' },
    { name: 'Push Square', url: 'https://www.pushsquare.com/feeds/news' },
    { name: 'Pure Xbox', url: 'https://www.purexbox.com/feeds/news' }
];

// Scalpel Filter: Only blocks specific AI/Crypto hype words
const BANNED_WORDS = ['chatgpt', 'bitcoin', 'ethereum', 'cryptocurrency', 'web3'];

async function getNews() {
    let allArticles = [];

    for (const feed of FEEDS) {
        try {
            // Using rss2json to convert XML to clean JSON for easier processing
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
            const data = await response.json();

            if (data.items) {
                const filtered = data.items.filter(item => {
                    const title = item.title.toLowerCase();
                    // Use description instead of content to avoid "Related Links" noise
                    const desc = (item.description || "").toLowerCase();
                    
                    // Check Title & Description only
                    const blob = title + " " + desc;

                    // 1. Hard Block (AI/Crypto)
                    if (BANNED_WORDS.some(word => blob.includes(word))) return false;

                    return true;
                });

                filtered.forEach(item => {
                    let bestImage = item.thumbnail || '';
                    const src = feed.name;

                    // --- PART A: THE IMAGE FIXER ---
                    // Only apply to the "Small Image" offenders
                    const needsUpscale = ['Nintendo Life', 'Pure Xbox', 'Push Square'];
                    if (needsUpscale.includes(src) && bestImage.includes('small.jpg')) {
                        bestImage = bestImage.replace('small.jpg', 'large.jpg');
                    }

                    // --- PART B: THE VERGE IMAGE FIXER ---
                    if (src.includes('The Verge') && bestImage.includes('/thumb/150/')) {
                        bestImage = bestImage.replace('/thumb/150/', '/original/');
                    }

                    // --- PART C: THE FALLBACK ---
                    // If the thumbnail is empty, try to scrape the first <img> from the content
                    if (!bestImage && item.content) {
                        const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
                        if (imgMatch) bestImage = imgMatch[1];
                    }

                    // --- PART D: DATA ASSEMBLY ---
                    // Clean up generic categories for the UI "Pill"
                    const displayCategory = (item.categories || [])
                        .find(c => {
                            const low = c.toLowerCase();
                            return !['news', 'gaming', 'articles', 'nintendo switch', 'ps5', 'xbox'].includes(low);
                        }) || item.categories[0] || 'Article';

                    allArticles.push({
                        title: item.title,
                        link: item.link,
                        thumbnail: bestImage,
                        source: src,
                        category: displayCategory,
                        date: new Date(item.pubDate).getTime()
                    });
                });
            }
        } catch (e) {
            console.error(`Failed to fetch ${feed.name}:`, e);
        }
    }

    // Sort by Newest First
    allArticles.sort((a, b) => b.date - a.date);

    // Save Top 60
    const finalNews = allArticles.slice(0, 60);

    fs.writeFileSync('news.json', JSON.stringify(finalNews, null, 2));
    console.log(`Successfully generated news.json with ${finalNews.length} articles.`);
}

getNews();