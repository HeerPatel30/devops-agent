const fs = require('fs');
const path = require('path');

/**
 * Universal Tech Stack, Framework, Database, and DevOps Discovery Engine.
 * Scans directories, parses manifest files, and extracts ground-truth facts.
 */
class StackDetectorService {
  constructor() {
    this.ignoredDirs = new Set([
      '.git', 'node_modules', 'dist', 'build', 'target', 'vendor',
      '.venv', 'venv', 'bin', 'obj', '.idea', '.vscode', 'coverage',
      '.next', '.nuxt', '.output', 'out'
    ]);
  }

  /**
   * Performs deep discovery on a project root directory.
   * 
   * @param {string} rootPath - Directory to inspect
   * @returns {Promise<Object>} Comprehensive discovery report
   */
  async detect(rootPath) {
    if (!rootPath || !fs.existsSync(rootPath)) {
      return this._getEmptyReport();
    }

    const files = this._scanDirectory(rootPath, 3);
    const manifestsFound = [];
    const languages = new Set();
    const frameworks = new Set();
    const databases = new Set();
    const devops = {
      docker: false,
      dockerCompose: false,
      kubernetes: false,
      ciCd: [],
      iac: [],
    };
    const extensionCounts = {};

    // 1. Analyze file extensions for language footprint
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      }

      const baseName = path.basename(file).toLowerCase();

      // DevOps artifact detection
      if (baseName === 'dockerfile' || baseName.startsWith('dockerfile.')) {
        devops.docker = true;
        manifestsFound.push(path.relative(rootPath, file));
      } else if (baseName === 'docker-compose.yml' || baseName === 'docker-compose.yaml' || baseName === 'compose.yaml') {
        devops.dockerCompose = true;
        manifestsFound.push(path.relative(rootPath, file));
      } else if (baseName === 'jenkinsfile') {
        devops.ciCd.push('Jenkins');
        manifestsFound.push(path.relative(rootPath, file));
      } else if (baseName === '.gitlab-ci.yml') {
        devops.ciCd.push('GitLab CI');
        manifestsFound.push(path.relative(rootPath, file));
      } else if (baseName === 'azure-pipelines.yml') {
        devops.ciCd.push('Azure Pipelines');
        manifestsFound.push(path.relative(rootPath, file));
      } else if (baseName === 'bitbucket-pipelines.yml') {
        devops.ciCd.push('Bitbucket Pipelines');
        manifestsFound.push(path.relative(rootPath, file));
      } else if (baseName.endsWith('.tf') || baseName.endsWith('.tfvars')) {
        if (!devops.iac.includes('Terraform')) devops.iac.push('Terraform');
      } else if (baseName === 'chart.yaml') {
        devops.kubernetes = true;
      }
    }

    // Check for GitHub Actions
    const ghActionsPath = path.join(rootPath, '.github', 'workflows');
    if (fs.existsSync(ghActionsPath)) {
      devops.ciCd.push('GitHub Actions');
      manifestsFound.push('.github/workflows');
    }

    // Check for Kubernetes manifests
    if (files.some(f => f.toLowerCase().includes('k8s') || f.toLowerCase().includes('kubernetes'))) {
      devops.kubernetes = true;
    }

    // 2. Language mapping from file extensions
    if (extensionCounts['.js'] || extensionCounts['.mjs'] || extensionCounts['.cjs']) languages.add('JavaScript');
    if (extensionCounts['.ts'] || extensionCounts['.tsx']) languages.add('TypeScript');
    if (extensionCounts['.py']) languages.add('Python');
    if (extensionCounts['.java']) languages.add('Java');
    if (extensionCounts['.go']) languages.add('Go');
    if (extensionCounts['.rs']) languages.add('Rust');
    if (extensionCounts['.cs']) languages.add('C# (.NET)');
    if (extensionCounts['.php']) languages.add('PHP');
    if (extensionCounts['.rb']) languages.add('Ruby');
    if (extensionCounts['.dart']) languages.add('Dart / Flutter');
    if (extensionCounts['.cpp'] || extensionCounts['.c'] || extensionCounts['.h']) languages.add('C/C++');
    if (extensionCounts['.swift']) languages.add('Swift');
    if (extensionCounts['.kt'] || extensionCounts['.kts']) languages.add('Kotlin');
    if (extensionCounts['.sql']) languages.add('SQL');

    // 3. Deep manifest inspection
    // A. Node.js (package.json)
    const pkgFiles = files.filter(f => path.basename(f) === 'package.json');
    for (const pkgFile of pkgFiles) {
      manifestsFound.push(path.relative(rootPath, pkgFile));
      languages.delete('JavaScript');
      languages.add('Node.js (JavaScript)');
      this._inspectPackageJson(pkgFile, frameworks, databases);
    }

    // B. Python (requirements.txt, pyproject.toml, Pipfile)
    const pyFiles = files.filter(f => ['requirements.txt', 'pyproject.toml', 'pipfile', 'setup.py'].includes(path.basename(f).toLowerCase()));
    for (const pyFile of pyFiles) {
      manifestsFound.push(path.relative(rootPath, pyFile));
      languages.add('Python');
      this._inspectPythonManifest(pyFile, frameworks, databases);
    }

    // C. Java / Kotlin (pom.xml, build.gradle)
    const javaFiles = files.filter(f => ['pom.xml', 'build.gradle', 'build.gradle.kts'].includes(path.basename(f).toLowerCase()));
    for (const jFile of javaFiles) {
      manifestsFound.push(path.relative(rootPath, jFile));
      languages.add('Java');
      this._inspectJavaManifest(jFile, frameworks, databases);
    }

    // D. Go (go.mod)
    const goMod = files.find(f => path.basename(f) === 'go.mod');
    if (goMod) {
      manifestsFound.push(path.relative(rootPath, goMod));
      languages.add('Go');
      this._inspectGoMod(goMod, frameworks, databases);
    }

    // E. Rust (Cargo.toml)
    const cargoToml = files.find(f => path.basename(f) === 'Cargo.toml');
    if (cargoToml) {
      manifestsFound.push(path.relative(rootPath, cargoToml));
      languages.add('Rust');
      this._inspectCargoToml(cargoToml, frameworks, databases);
    }

    // F. .NET (csproj)
    const csProj = files.find(f => f.endsWith('.csproj'));
    if (csProj) {
      manifestsFound.push(path.relative(rootPath, csProj));
      languages.add('C# (.NET)');
      this._inspectCsProj(csProj, frameworks, databases);
    }

    // G. PHP (composer.json)
    const composerJson = files.find(f => path.basename(f) === 'composer.json');
    if (composerJson) {
      manifestsFound.push(path.relative(rootPath, composerJson));
      languages.add('PHP');
      this._inspectComposerJson(composerJson, frameworks, databases);
    }

    // H. Flutter / Dart (pubspec.yaml)
    const pubspecYaml = files.find(f => path.basename(f) === 'pubspec.yaml');
    if (pubspecYaml) {
      manifestsFound.push(path.relative(rootPath, pubspecYaml));
      languages.add('Dart / Flutter');
      frameworks.add('Flutter');
    }

    // Construct high-level architecture classification
    const archClassification = this._classifyArchitecture(languages, frameworks, databases);

    return {
      classification: archClassification,
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      databases: Array.from(databases),
      devops: {
        docker: devops.docker,
        dockerCompose: devops.dockerCompose,
        kubernetes: devops.kubernetes,
        ciCd: Array.from(new Set(devops.ciCd)),
        iac: Array.from(new Set(devops.iac)),
      },
      manifestsFound: Array.from(new Set(manifestsFound)),
      extensionCounts,
    };
  }

  /**
   * Inspects Node.js package.json for frameworks and databases.
   * @private
   */
  _inspectPackageJson(filePath, frameworks, databases) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const deps = { ...content.dependencies, ...content.devDependencies };

      // Frameworks
      if (deps['express']) frameworks.add('Express');
      if (deps['fastify']) frameworks.add('Fastify');
      if (deps['@nestjs/core']) frameworks.add('NestJS');
      if (deps['koa']) frameworks.add('Koa');
      if (deps['next']) frameworks.add('Next.js');
      if (deps['nuxt']) frameworks.add('Nuxt');
      if (deps['react']) frameworks.add('React');
      if (deps['vue']) frameworks.add('Vue');
      if (deps['@angular/core']) frameworks.add('Angular');
      if (deps['svelte']) frameworks.add('Svelte');

      // Databases & ORMs
      if (deps['pg'] || deps['pg-promise'] || deps['postgres']) databases.add('PostgreSQL');
      if (deps['mysql'] || deps['mysql2']) databases.add('MySQL');
      if (deps['sqlite3'] || deps['better-sqlite3']) databases.add('SQLite');
      if (deps['tedious'] || deps['mssql']) databases.add('Microsoft SQL Server');
      if (deps['sequelize']) databases.add('Sequelize (SQL ORM)');
      if (deps['prisma'] || deps['@prisma/client']) databases.add('Prisma (ORM)');
      if (deps['typeorm']) databases.add('TypeORM');
      if (deps['knex']) databases.add('Knex.js (SQL Query Builder)');
      if (deps['drizzle-orm']) databases.add('Drizzle ORM');

      // NoSQL
      if (deps['mongoose'] || deps['mongodb']) databases.add('MongoDB');
      if (deps['redis'] || deps['ioredis']) databases.add('Redis');
      if (deps['@aws-sdk/client-dynamodb'] || deps['dynamoose']) databases.add('AWS DynamoDB');
      if (deps['firebase'] || deps['firebase-admin']) databases.add('Firebase / Firestore');
    } catch {
      // Ignore parse errors on malformed package.json
    }
  }

  /**
   * Inspects Python dependencies.
   * @private
   */
  _inspectPythonManifest(filePath, frameworks, databases) {
    try {
      const text = fs.readFileSync(filePath, 'utf8').toLowerCase();

      // Frameworks
      if (text.includes('django')) frameworks.add('Django');
      if (text.includes('fastapi')) frameworks.add('FastAPI');
      if (text.includes('flask')) frameworks.add('Flask');
      if (text.includes('tornado')) frameworks.add('Tornado');

      // Databases
      if (text.includes('sqlalchemy')) databases.add('SQLAlchemy (ORM)');
      if (text.includes('psycopg2') || text.includes('asyncpg')) databases.add('PostgreSQL');
      if (text.includes('pymysql') || text.includes('mysqlclient')) databases.add('MySQL');
      if (text.includes('pymongo') || text.includes('motor')) databases.add('MongoDB');
      if (text.includes('redis')) databases.add('Redis');
    } catch {
      // Ignore read errors
    }
  }

  /**
   * Inspects Java pom.xml or build.gradle.
   * @private
   */
  _inspectJavaManifest(filePath, frameworks, databases) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');

      if (text.includes('spring-boot')) frameworks.add('Spring Boot');
      if (text.includes('micronaut')) frameworks.add('Micronaut');
      if (text.includes('quarkus')) frameworks.add('Quarkus');

      if (text.includes('postgresql')) databases.add('PostgreSQL');
      if (text.includes('mysql-connector')) databases.add('MySQL');
      if (text.includes('hibernate')) databases.add('Hibernate (JPA)');
      if (text.includes('mongodb')) databases.add('MongoDB');
    } catch {
      // Ignore
    }
  }

  /**
   * Inspects Go go.mod.
   * @private
   */
  _inspectGoMod(filePath, frameworks, databases) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      if (text.includes('github.com/gin-gonic/gin')) frameworks.add('Gin');
      if (text.includes('github.com/gofiber/fiber')) frameworks.add('Fiber');
      if (text.includes('github.com/labstack/echo')) frameworks.add('Echo');

      if (text.includes('gorm.io/gorm')) databases.add('GORM (SQL ORM)');
      if (text.includes('github.com/lib/pq') || text.includes('github.com/jackc/pgx')) databases.add('PostgreSQL');
      if (text.includes('github.com/go-sql-driver/mysql')) databases.add('MySQL');
      if (text.includes('go.mongodb.org/mongo-driver')) databases.add('MongoDB');
      if (text.includes('github.com/redis/go-redis')) databases.add('Redis');
    } catch {
      // Ignore
    }
  }

  /**
   * Inspects Rust Cargo.toml.
   * @private
   */
  _inspectCargoToml(filePath, frameworks, databases) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      if (text.includes('actix-web')) frameworks.add('Actix-web');
      if (text.includes('axum')) frameworks.add('Axum');
      if (text.includes('rocket')) frameworks.add('Rocket');

      if (text.includes('diesel')) databases.add('Diesel (ORM)');
      if (text.includes('sqlx')) databases.add('SQLx');
      if (text.includes('tokio-postgres')) databases.add('PostgreSQL');
    } catch {
      // Ignore
    }
  }

  /**
   * Inspects .NET csproj files.
   * @private
   */
  _inspectCsProj(filePath, frameworks, databases) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      if (text.includes('Microsoft.AspNetCore')) frameworks.add('ASP.NET Core');
      if (text.includes('EntityFrameworkCore')) databases.add('Entity Framework Core');
      if (text.includes('Npgsql')) databases.add('PostgreSQL');
      if (text.includes('SqlClient')) databases.add('SQL Server');
    } catch {
      // Ignore
    }
  }

  /**
   * Inspects PHP composer.json.
   * @private
   */
  _inspectComposerJson(filePath, frameworks, databases) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      if (text.includes('laravel/framework')) frameworks.add('Laravel');
      if (text.includes('symfony/')) frameworks.add('Symfony');
      if (text.includes('doctrine/')) databases.add('Doctrine ORM');
    } catch {
      // Ignore
    }
  }

  /**
   * Synthesizes stack classification string.
   * @private
   */
  _classifyArchitecture(languages, frameworks, databases) {
    const langList = Array.from(languages);
    const fwList = Array.from(frameworks);
    const dbList = Array.from(databases);

    let summary = 'Software Application';
    if (langList.length > 0) {
      summary = `${langList.slice(0, 2).join(' / ')} Application`;
    }

    if (fwList.length > 0) {
      summary += ` (${fwList.slice(0, 2).join(', ')})`;
    }

    if (dbList.length > 0) {
      summary += ` with ${dbList.slice(0, 2).join(', ')}`;
    }

    return summary;
  }

  /**
   * Scans directory recursively up to maxDepth.
   * @private
   */
  _scanDirectory(dir, maxDepth = 3, currentDepth = 0) {
    if (currentDepth > maxDepth) return [];
    let results = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.ignoredDirs.has(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(this._scanDirectory(fullPath, maxDepth, currentDepth + 1));
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    } catch {
      // Silently ignore permissions errors
    }

    return results;
  }

  _getEmptyReport() {
    return {
      classification: 'Unknown / Empty Project',
      languages: [],
      frameworks: [],
      databases: [],
      devops: { docker: false, dockerCompose: false, kubernetes: false, ciCd: [], iac: [] },
      manifestsFound: [],
      extensionCounts: {},
    };
  }
}

module.exports = StackDetectorService;
