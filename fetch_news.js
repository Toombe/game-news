const fs = require('fs');

const FEEDS = [
    { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
    { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed' },
    { name: 'Eurogamer', url: 'https://www.eurogamer.net/feed/news' },
    { name: 'The Verge (Games)', url: 'https://www.theverge.com/games/rss/index.xml' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/gaming' }
];

const BANNED = ['ai', 'chatgpt', 'crypto', 'nft', 'blockchain', 'web3', 'bitcoin', 'stablecoin', 'llm', 'midjourney'];

async function getNews() {
    let allArticles = [];

    for (const feed of FEEDS) {
        try {
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
            const data = await response.json();

            if (data.items) {
                const filtered = data.items.filter(item => {
                    const blob = (item.title + item.description + item.content).toLowerCase();
                    return !BANNED.some(word => blob.includes(word));
                });

                filtered.forEach(item => {
                    allArticles.push({
                        title: item.title,
                        link: item.link,
                        thumbnail: item.thumbnail || item.enclosure?.link || '',
                        source: feed.name,
                        date: new Date(item.pubDate).getTime()
                    });
                });
            }
        } catch (e) {
            console.error(`Failed ${feed.name}:`, e);
        }
    }

    // Sort by newest and take top 30
    allArticles.sort((a, b) => b.date - a.date);
    const finalNews = allArticles.slice(0, 30);

    fs.writeFileSync('news.json', JSON.stringify(finalNews, null, 2));
    console.log(`Saved ${finalNews.length} clean articles.`);
}

getNews();