import app from './app';
import config from './config';
import chalk from 'chalk'; // Import chalk library for colored text

app.listen(config.port, () => {
    console.log(chalk.yellow(`⚡️ ${config.name} ${config.version} ⚡️`)); // Yellow text
    console.log(chalk.cyan(`⚡️ Listening on ${config.port} with NODE_ENV=${config.nodeEnv} ⚡️`)); // Cyan text
    console.log(chalk.magenta.bold(`⚡️ Start Project SMS bomb ⚡️`)); // Bold magenta text
    console.log(chalk.green('⚡️💻 Server is up and running! ⚡️')); // Green text
});

// 🚀 (Rocket): console.log('🚀 Launching the app!');
// 🌈 (Rainbow): console.log('🌈 All systems go!');
// 🎉 (Party Popper): console.log('🎉 Celebrate success!');
// 🔥 (Fire): console.log('🔥 Things are heating up!');
// 👍 (Thumbs Up): console.log('👍 Everything looks good!');
// 🌟 (Star): console.log('🌟 App is shining bright!');
// 💻 (Computer): console.log('💻 Code executed successfully!');
// 🌺 (Flower): console.log('🌺 Welcome to the app!');
// 🎵 (Musical Note): console.log('🎵 Music is playing!');
// 🚗 (Car): console.log('🚗 App is on the move!');
// 🍕 (Pizza): console.log('🍕 Time for a coding break!');
// 📈 (Chart Increasing): console.log('📈 Code performance is rising!');
// 🚦 (Traffic Light): console.log('🚦 Ready, set, code!');
// 🏆 (Trophy): console.log('🏆 Another coding victory!');
// 🌟 (Sparkles): console.log('🌟 App is sparkling!');
// 🚀 (Spaceship): console.log('🚀 Code is on a journey!');
// 🌍 (Earth Globe): console.log('🌍 Code that spans the globe!');
// 📚 (Books): console.log('📚 Learning something new!');
// 🧠 (Brain): console.log('🧠 Coding with the brainpower!');
// 💡 (Lightbulb): console.log('💡 Idea just struck!');
// 🎨 (Palette): console.log('🎨 Crafting beautiful code!');