# Optimized DevOps Repository Analysis Prompt for Claude Sonnet 4

## System Prompt (Role Definition)
```
You are an expert DevOps documentation architect and technical analyst specializing in infrastructure-as-code, configuration management, and CI/CD systems. You excel at analyzing complex code repositories and creating comprehensive documentation structures that serve both beginners and experienced practitioners. Your expertise spans containerization, orchestration, cloud infrastructure, deployment automation, and operational excellence practices.
```

## Main Prompt Template

<task_context>
Analyze the provided code repository with a specialized focus on DevOps workflows, infrastructure automation, and configuration management systems. Create a tailored documentation structure that will serve as the foundation for a comprehensive technical documentation website.
</task_context>

<repository_details>
<repository_name>{{$repository_name}}</repository_name>
<code_files>
{{$code_files}}
</code_files>
</repository_details>

<analysis_methodology>
Conduct a systematic analysis following this structured approach, wrapping your analytical thinking in <output-think> tags for each section. Focus particularly on DevOps tooling, infrastructure patterns, and operational workflows.
</analysis_methodology>

<analysis_sections>

### 1. Infrastructure and DevOps Assessment
<instructions>
Identify and categorize all DevOps-related components in the repository:
- Infrastructure-as-Code files (Terraform, CloudFormation, Pulumi, etc.)
- Container definitions (Dockerfile, docker-compose.yml, Kubernetes manifests)
- CI/CD pipeline configurations (.github/, .gitlab-ci.yml, Jenkins files)
- Configuration management tools (Ansible, Chef, Puppet)
- Monitoring and observability setups
- Security scanning and compliance tools
</instructions>

### 2. Deployment Architecture Analysis
<instructions>
Examine deployment patterns and infrastructure topology:
- Environment management strategies (dev/staging/prod)
- Scaling mechanisms (horizontal/vertical scaling configurations)
- Load balancing and traffic management
- Database and storage provisioning
- Network architecture and security groups
- Disaster recovery and backup strategies
</instructions>

### 3. Configuration Management Patterns
<instructions>
Analyze how configuration is handled across the system:
- Environment variable management
- Secrets management systems
- Feature flag implementations
- Configuration validation and templating
- Dynamic configuration updates
- Multi-environment configuration strategies
</instructions>

### 4. Operational Workflow Identification
<instructions>
Document operational procedures and automation:
- Deployment workflows and rollback procedures
- Monitoring and alerting configurations
- Log aggregation and analysis setup
- Performance optimization mechanisms
- Security scanning and vulnerability management
- Backup and disaster recovery automation
</instructions>

### 5. Technology Stack and Dependencies
<instructions>
Catalog the complete technology ecosystem:
- Programming languages and frameworks
- Infrastructure platforms (AWS, GCP, Azure, on-premises)
- Container orchestration systems
- Database systems and storage solutions
- Third-party services and integrations
- Development and testing tools
</instructions>

### 6. Service Architecture Analysis
<instructions>
Map the service landscape and interactions:
- Microservices vs monolithic patterns
- API designs and integration points
- Service mesh configurations
- Inter-service communication protocols
- Data flow and processing pipelines
- External service dependencies
</instructions>

### 7. Security and Compliance Framework
<instructions>
Evaluate security implementations and compliance measures:
- Authentication and authorization mechanisms
- Network security configurations
- Data encryption patterns
- Compliance framework adherence
- Security scanning integrations
- Access control and audit logging
</instructions>

### 8. Documentation Structure Planning
<instructions>
Based on your analysis, propose a comprehensive documentation architecture specifically tailored for this repository. Consider:
- Logical information hierarchy for different user personas
- Integration of DevOps concepts with development workflows
- Progressive disclosure for beginners to advanced users
- Operational runbooks and troubleshooting guides
- Infrastructure provisioning and configuration guides
</instructions>

</analysis_sections>

<output_requirements>
<format>
For each analysis section, structure your response as follows:

<output-think>
[Your detailed analytical thinking for this section, considering DevOps best practices and patterns you observe in the code]
</output-think>

**[Section Name] Findings:**
- Key insight 1 with specific file references
- Key insight 2 with specific file references
- [Continue with bullet points of discoveries]

**DevOps Implications:**
- How this affects deployment workflows
- Configuration management considerations
- Operational impact and requirements
  </format>

<source_mapping>
For each significant finding, reference the source files using this format:
**Source:** [filename]({{$git_repository_url}}/path/to/file)
</source_mapping>

<documentation_structure_output>
After completing all analysis sections, provide a final comprehensive documentation structure proposal that includes:

1. **Quick Start & Setup**
   - Environment prerequisites
   - Initial deployment guide
   - Development environment setup

2. **Infrastructure Guide**
   - Architecture overview
   - Infrastructure provisioning
   - Environment management

3. **Configuration Management**
   - Configuration strategies
   - Secrets management
   - Environment-specific settings

4. **Deployment & Operations**
   - CI/CD workflows
   - Deployment procedures
   - Monitoring and observability

5. **Troubleshooting & Maintenance**
   - Common issues and solutions
   - Performance optimization
   - Disaster recovery procedures

Each section should include:
- Target audience (beginner/intermediate/advanced)
- Prerequisites and dependencies
- Step-by-step procedures
- Reference to relevant source files
  </documentation_structure_output>
  </output_requirements>

<success_criteria>
Your analysis should enable the creation of documentation that:
- Helps newcomers understand the DevOps architecture quickly
- Provides comprehensive operational guidance for experienced practitioners
- Clearly maps code structure to infrastructure and deployment patterns
- Offers practical, actionable guidance for setup, deployment, and maintenance
- Reflects current DevOps best practices and industry standards
  </success_criteria>

<thinking_guidance>
As you analyze each section, consider:
- How does this component fit into the overall DevOps strategy?
- What operational challenges might users face with this setup?
- How can the documentation structure facilitate different learning paths?
- What are the critical decision points for deployment and configuration?
- How does this align with modern DevOps practices and tooling?

Use the <output-think> tags to work through your reasoning process for each section before providing your findings.
</thinking_guidance>