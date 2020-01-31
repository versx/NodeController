# NodeController  

## Installation  
1.) Clone the repository:  
```
ssh: git clone git@github.com/versx/NodeController
or
http: git clone https://github.com/versx/NodeController
```
2.) Install dependencies:  
```
npm install
```
3.) Copy config file:
```
cp config.json.example config.json
```
4.) Fill out config options:
```
{
    "ports": {
        "api": 3000, // Management api
        "webhook": 3001 // Raw data api
    },
    "redis": {
        "host": "127.0.0.1", // Redis host
        "port": 6379, // Redis port
        "password": null // Redis password (optional)
    },
    "db": {
        "host": "127.0.0.1", // Database host
        "port": 3306, // Database port
        "username": "user", // Database username
        "password": "pass123", // Database password
        "database": "node", // Database name
        "charset": "utf8mb4", // Database character set
        "debug": true, // Show database debug logs
        "connectionLimit": 1000 // Database connection pool limit
    },
    "webhook": {
        "urls": ["http://127.0.0.1:4000"], // Webhook urls
        "delay": 5 // Webhook sending delay
    }
}
```
5.) Compile NodeJS files to Typescript in root folder.
```
tsc
```
5.) Run:  
```
node index.js
```
